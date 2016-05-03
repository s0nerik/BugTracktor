'use strict';

var util = require('util');
var utils = require('../helpers/utils');
var projectsSql = require('../helpers/sql/projects')

module.exports = {
  listProjects: listProjects,
  createProject: createProject
};

function listProjects(req, res) {
  var projects = knex.select().from(tables.TABLE_PROJECTS).then(function(info) {
    console.log(info);
    res.json(utils.without_nulls(info));
  }, function (info) {
    res.json(info);
  });

  // this sends back a JSON response which is a single string
  // res.json(projects);
}

function createProject(req, res) {
  // // variables defined in the Swagger document can be referenced using req.swagger.params.{parameter_name}
  // var obj = {
  //   id: "0",
  //   name: req.swagger.params.project.value.name
  // };

  projectsSql.new(req.swagger.params.project.value).then(function(ids){
    return projectsSql.get(ids[0]);
  }).then(function(data) {
    console.log(data);
    res.json(utils.without_nulls(data[0]));
  });

  // this sends back a JSON response which is a single string
  // res.json(obj);

  // res.json(req.swagger.params.project.value);
}
