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
  var query = Promise.resolve(true);
  query = T.projects.get_user_project_by_id(req.user, req.swagger.params.projectId.value)

  query = query.then(project => T.project_issues.get(req.swagger.params.projectId.value)
                                                  .then(issues => {
                                                    for (var i in issues) {
                                                      issues[i].project = { id: req.swagger.params.projectId.value };
                                                    }
                                                    project.issues = issues;
                                                    return project;
                                                  }));

  query = query.then(project => T.project_creators.get_creator_by_project_id(req.swagger.params.projectId.value)
                                                  .then(creator => {
                                                    project.creator = creator;
                                                    return project;
                                                  }));

  query = query.then(project => T.project_members.get_members_by_project_id(req.swagger.params.projectId.value)
                                                 .then(members => { // not a ProjectMember, just a User
                                                   project["members"] = members;
                                                   return project;
                                                 }));

  query = query.then(project => {
    let users = project["members"];
    project["members"] = [];
    var innerQuery = Promise.resolve(project);
    for (let user in users) {
      var innerQuery = innerQuery.then(project =>
        T.project_member_roles.get_all_user_roles_in_project(project.id, users[user].id)
                              .then(roles => {
                                project["members"].push({user: users[user], roles: roles});
                                return project;
                              })
      );
    }
    return innerQuery;
  });

  query = query.then(project => {
              console.log("project: "+JSON.stringify(project));
              if (project) res.json(project);
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
