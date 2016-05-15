'use strict';

var util = require('util');

var T = require('../helpers/sql/tables');

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
            .then(info => {
              if (info) res.json(info);
              else res.json(404, {message: "Not found"});
            });
}

function updateProject(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                       req.swagger.params.project.value.id = req.swagger.params.projectId.value;
                       T.projects.update(req.swagger.params.project.value).then(data => res.json(data));
                     } else {
                       res.json(403, {message: "You're not a member of this project"});
                     }
                   })
}

function createProject(req, res) {
  T.projects.new(req.swagger.params.project.value).then(data => res.json(data));
}

function deleteProject(req, res) {
  T.projects.remove(req.swagger.params.projectId.value).then(data => res.json(data));
}
