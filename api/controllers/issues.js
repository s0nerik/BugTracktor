'use strict';

module.exports = {
  listIssues: listIssues,
  createIssue: createIssue,
};

function listIssues(req, res) {
  tables.issues.get(null, req.swagger.params.projectId.value).then(function(info) { res.json(info) });
}

function createIssue(req, res) {
  tables.issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
               .then(function(info) {
                 console.log(info);
                 res.json(info)
               });
}

function getIssue(req, res) {
  tables.issues.get(req.swagger.params.issueId.value).then(function(info) { res.json(info) });
}
