'use strict';

var T = require('../helpers/sql/tables');
var utils = require('../helpers/utils');
var Promise = require("bluebird");
var _ = require('lodash');

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
                       T.project_issues.get(req.swagger.params.projectId.value)
                                       // Add project the issue belongs to.
                                       .then(issues => {
                                         for(var i in issues) {
                                           issues[i].project = { id: req.swagger.params.projectId.value };
                                         }
                                         return issues;
                                       })
                                       .then(info => res.json(info));
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
                                       .then(issue => res.json(issue));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issues."});
                     }
                   });
}

function createIssue(req, res) {
  req.swagger.params.issue.value.author_id = req.user.id;
  T.project_issues.new(req.swagger.params.projectId.value, req.swagger.params.issue.value)
                  // Add project the issue belongs to.
                  .then(issue => {
                    issue.project = { id: req.swagger.params.projectId.value };
                    return issue;
                  })
                  .then(issue => res.json(issue));
}

function updateIssue(req, res) {
  T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value)
                  .then(localIssue => {
                    // console.log("\n\n\nT.project_issues.get: "+JSON.stringify(issue));
                    if (localIssue) {
                      var diffs = {};
                      // var diffs = utils.keyValueDiffs(localIssue, req.swagger.params.issue.value);
                      console.log("Old Issue: "+JSON.stringify(localIssue));
                      console.log("New Issue: "+JSON.stringify(req.swagger.params.issue.value));
                      // console.log("Diff: "+JSON.stringify(diffs));

                      let newIssue = req.swagger.params.issue.value;
                      newIssue.id = localIssue.id;
                      return T.project_issues.update(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value, newIssue)
                                              .then(issue => {
                                                // console.log("\n\n\nT.project_issues.update.then(1): "+JSON.stringify(issue));
                                                // TODO: save actual diff type into the table
                                                if (Object.keys(diffs).length > 0) {
                                                  var change = Object.assign({
                                                    issue_id: issue.id,
                                                    date: new Date().toISOString(),
                                                    author_id: req.user.id
                                                  }, { change: JSON.stringify(utils.produceIssueChangeInfo(diffs)) });
                                                  return T.issue_changes.new(change)
                                                                        .return(issue);
                                                } else {
                                                  return issue;
                                                }
                                              })
                                              // Update attachments if should
                                              .then(issue => {
                                                // console.log("\n\n\nT.project_issues.update.then(2): "+JSON.stringify(issue));
                                                var attachments = newIssue.attachments;
                                                if (attachments) {
                                                  var promise = Promise.resolve(true);
                                                  promise = promise.then(data => T.issue_attachments.get(newIssue.id))
                                                                    .then(dbAttachments => {
                                                                      console.log("\n\n\attachments: "+JSON.stringify(attachments));
                                                                      console.log("\n\n\dbAttachments: "+JSON.stringify(dbAttachments));
                                                                      var toRemove = _.differenceBy(dbAttachments, attachments, x => x.url);
                                                                      console.log("\n\n\ntoRemove: "+JSON.stringify(toRemove));
                                                                      if (toRemove) {
                                                                        var localPromise = Promise.resolve(true);
                                                                        for (var i in toRemove) {
                                                                          let rem = toRemove[i];
                                                                          localPromise = localPromise.then(x => T.issue_attachments.remove(newIssue.id, rem.url));
                                                                        }
                                                                        return localPromise;
                                                                      } else {
                                                                        return true;
                                                                      }
                                                                    });
                                                  for(var i in attachments) {
                                                    if (attachments[i].url) {
                                                      let att = attachments[i];
                                                      promise = promise.then(data => T.issue_attachments.exists(newIssue.id, att.url))
                                                                        .then(exists => {
                                                                          if (!exists) {
                                                                            return T.issue_attachments.new(newIssue.id, att.url);
                                                                          } else {
                                                                            return true;
                                                                          }
                                                                        });
                                                    }
                                                  }
                                                  return promise.then(data => T.project_issues.get(req.swagger.params.projectId.value, req.swagger.params.issueIndex.value));
                                                } else {
                                                  return issue;
                                                }
                                              })
                                              .then(issue => res.json(issue));
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
