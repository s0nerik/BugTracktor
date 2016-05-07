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
  T.projects.get(null).then(function(info) { res.json(info) });
}

function getProject(req, res) {
  T.projects.get(req.swagger.params.projectId.value).then(data => res.json(data));
}

function updateProject(req, res) {
  req.swagger.params.project.value.id = req.swagger.params.projectId.value;
  T.projects.update(req.swagger.params.project.value).then(data => res.json(data));
}

function createProject(req, res) {
  T.projects.new(req.swagger.params.project.value).then(data => res.json(data));
}

function deleteProject(req, res) {
  T.projects.remove(req.swagger.params.projectId.value).then(data => res.json(data));
}
