'use strict';

var T = require('../helpers/sql/tables');
var utils = require('../helpers/utils');

module.exports = {
  listIssues: listIssues,
  createIssue: createIssue,
  getIssue: getIssue,
  updateIssue: updateIssue,
  getIssueChanges: getIssueChanges,
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
                                       .then(issue => T.issue_assignments.get_assignees_for_issue_id(issue.id)
                                                                         .then(assignees => issue.assignees = assignees)
                                                                         .return(issue))
                                       .then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issues."});
                     }
                   });
}

function createIssue(req, res) {
  req.swagger.params.issue.value.author = req.user;
  T.project_issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
                  .then(info => res.json(info));
}

function updateIssue(req, res) {
  T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                  .then(issue => {
                    if (issue) {
                      var diffs = utils.keyValueDiffs(issue, req.swagger.params.issue.value);
                      console.log("Old Issue: "+JSON.stringify(issue));
                      console.log("New Issue: "+JSON.stringify(req.swagger.params.issue.value));
                      console.log("Diff: "+JSON.stringify(diffs));

                      req.swagger.params.issue.value.id = issue.id;
                      T.issues.update(req.swagger.params.issue.value)
                              .then(info => {
                                // TODO: save actual diff type into the table
                                if (Object.keys(diffs).length > 0) {
                                  var change = Object.assign({
                                    issue_id: issue.id,
                                    date: new Date().toISOString(),
                                    author_id: req.user.id
                                  }, { change: JSON.stringify(utils.produceIssueChangeInfo(diffs)) });
                                  return T.issue_changes.new(change)
                                                        .return(info);
                                } else {
                                  return info;
                                }
                              })
                              .then(info => res.json(info));
                    } else {
                      res.status(404).json({message: "Issue not found."});
                    }
                  });
}

function getIssueChanges(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                       T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                                       .then(issue => {
                                         if (issue) {
                                          T.issue_changes.get(issue.id)
                                                         .then(info => res.json(info));
                                         } else {
                                           res.status(404).json({message: "Requested issue is not found."});
                                         }
                                       });
                     } else {
                       res.status(403).json({message: "You must be a project member to see its issue changes."});
                     }
                   })
}
