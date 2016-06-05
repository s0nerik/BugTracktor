'use strict';

var util = require('util');

var T = require('../helpers/sql/tables');
var Promise = require("bluebird");

module.exports = {
  listProjects: listProjects,
  createProject: createProject,
  getProject: getProject,
  updateProject: updateProject,
  deleteProject: deleteProject,
};

function listProjects(req, res) {
  T.projects.get_user_projects(req.user).then(info => res.json(info));
}

function getProject(req, res) {
  T.projects.get_user_project_by_id(req.user, req.swagger.params.projectId.value)
            .then(project => {
              if (project) res.json(project);
              else res.json(404, {message: "Not found"});
            });
}

function updateProject(req, res) {
  var projectId = req.swagger.params.projectId.value;
  var newProject = req.swagger.params.project.value;
  newProject.id = projectId;

  var originalProject;
  var isMember = true;

  var query = T.project_members.check_member(req.user.id, projectId)
                               .then(checkResult => isMember = checkResult);

  // Get the original project
  query = query.then(data => {
    if (!isMember) return data;
    return originalProject = T.projects.get_user_project_by_id(req.user, projectId);
  });

  // Update project's main fields
  query = query.then(data => {
    if (!isMember || !originalProject) return data;
    return T.projects.update(newProject);
  });

  // Get the updated project
  query = query.then(data => {
    if (!isMember || !originalProject) return data;
    return T.projects.get_user_project_by_id(req.user, projectId);
  });

  return query.then(data => {
    if (isMember) {
      if (originalProject) {
        res.json(data);
      } else {
        res.json(404, {message: "Project with a given id is not found."});
      }
    } else {
      res.json(403, {message: "You're not a member of this project"});
    }
  });
}

function createProject(req, res) {
  T.projects.new(req.user.id, req.swagger.params.project.value).then(data => res.json(data));
}

function deleteProject(req, res) {
  T.project_creators.is_creator(req.user.id, req.swagger.params.projectId.value)
                        .then(isCreator => {
                          if (isCreator) {
                            T.projects.remove(req.swagger.params.projectId.value).then(data => res.json({message: "Success"}));
                          } else {
                            res.status(403).json({message: "Only project creator can delete the project."});
                          }
                        })
}
