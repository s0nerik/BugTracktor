'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  listIssues: listIssues,
  createIssue: createIssue,
  getIssue: getIssue,
};

function listIssues(req, res) {
  T.issues.get(null, req.swagger.params.projectId.value).then(function(info) { res.json(info) });
}

function createIssue(req, res) {
  T.project_issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
               .then(function(info) {
                 console.log(info);
                 res.json(info)
               });
}

function getIssue(req, res) {
  T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueId.value)
                  .then(info => {
                    console.log(info);
                    res.json(info);
                  });
}
