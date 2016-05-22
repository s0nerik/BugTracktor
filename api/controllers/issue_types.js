'use strict';

var T = require('../helpers/sql/tables');
var utils = require('../helpers/utils');

module.exports = {
  listIssueTypes: listIssueTypes,
  createIssueType: createIssueType,
  getIssueType: getIssueType,
  updateIssueType: updateIssueType
};

function listIssueTypes(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                         T.project_issue_types.get_for_project_id(req.swagger.params.projectId.value)
                                              .then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issue types."});
                     }
                   });
}

function createIssueType(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                        T.issue_types.new(req.swagger.params.issueType.value)
                                     .then(issueType => T.project_issue_types.new(req.swagger.params.projectId.value, issueType.id).return(issueType))
                                     .then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to create a new issue type."});
                     }
                   });
}

function getIssueType(req, res) {

}

function updateIssueType(req, res) {

}
