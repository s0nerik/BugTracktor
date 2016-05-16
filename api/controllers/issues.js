'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  listIssues: listIssues,
  createIssue: createIssue,
  getIssue: getIssue,
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

function createIssue(req, res) {
  T.project_issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
               .then(function(info) {
                 console.log(info);
                 res.json(info)
               });
}

function getIssue(req, res) {
  T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                  .then(info => {
                    console.log(info);
                    res.json(info);
                  });
}
