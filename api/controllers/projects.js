'use strict';

var util = require('util');

module.exports = {
  listProjects: listProjects,
  createProject: createProject,
  getProject: getProject,
  updateProject: updateProject,
  deleteProject: deleteProject,
};

function listProjects(req, res) {
  tables.projects.get(null).then(function(info) { res.json(info) });
}

function getProject(req, res) {
  tables.projects.get(req.swagger.params.projectId.value).then(function(data) { res.json(data) });
}

function updateProject(req, res) {
  req.swagger.params.project.value.id = req.swagger.params.projectId.value;
  tables.projects.update(req.swagger.params.project.value).then(function(data) { res.json(data) });
}

function createProject(req, res) {
  tables.projects.new(req.swagger.params.project.value).then(function(data) { res.json(data) });
}

function deleteProject(req, res) {
  tables.projects.remove(req.swagger.params.projectId.value).then(function(data) { res.json(data) });
}
