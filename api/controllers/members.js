'use strict';

var T = require('../helpers/sql/tables');
var utils = require('../helpers/utils');
var Promise = require("bluebird");
var _ = require('lodash');

module.exports = {
  createMember: createMember,
  getMembers: getMembers,
  getMember: getMember,
  updateMember: updateMember,
  deleteMember: deleteMember,
};

function createMember(req, res) {
  var member = req.swagger.params.member.value;
  var query = T.project_members.make_member(req.user.id, req.swagger.params.projectId.value);
  for (var i in member.roles) {
    query = query.then(data => T.project_member_roles.give_role(req.user.id, req.swagger.params.projectId.value, member.roles[i].id));
  }
  query = query.then(data => T.project_members.get(req.user.id, req.swagger.params.projectId.value))
  query = query.then(member => res.json(member));
}

function getMembers(req, res) {

}

function getMember(req, res) {
  var query = T.project_members.get(req.user.id, req.swagger.params.projectId.value);
  query = query.then(member => res.json(member));
}

function updateMember(req, res) {

}

function deleteMember(req, res) {
}
