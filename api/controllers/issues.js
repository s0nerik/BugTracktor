'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  listIssues: listIssues,
  createIssue: createIssue,
  getIssue: getIssue,
  updateIssue: updateIssue,
};

function listIssues(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                       T.project_issues.get(req.swagger.params.projectId.value).then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issues."});
                     }
                   });
}

function getIssue(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                       T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                                       .then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issues."});
                     }
                   });
}

function createIssue(req, res) {
  T.project_issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
                  .then(info => res.json(info));
}

function updateIssue(req, res) {
  T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                  .then(issue => {
                    if (issue) {
                      req.swagger.params.issue.value.id = issue.id;
                      T.issues.update(req.swagger.params.issue.value)
                              .then(info => res.json(info));
                    } else {
                      res.status(404).json({message: "Issue not found."});
                    }
                  });
}
