'use strict';

var util = require('util');

module.exports = {
  listProjects: listProjects,
  createProject: createProject
};

function listProjects(req, res) {
  tables.projects.get(null).then(function(info) { res.json(info) });
}

function createProject(req, res) {
  tables.projects.new(req.swagger.params.project.value).then(function(data) { res.json(data) });
}
