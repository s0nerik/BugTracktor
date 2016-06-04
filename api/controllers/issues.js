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
  var projectId = req.swagger.params.projectId.value;
  var issueIndex = req.swagger.params.issueIndex.value;
  var newIssue = req.swagger.params.issue.value;

  var issueNotFound = false;

  // Get original issue
  var query = T.project_issues.get(projectId, issueIndex);

  var originalIssue;

  // Update issue
  query = query.then(localIssue => {
    if (localIssue) {
      originalIssue = localIssue;

      newIssue.id = localIssue.id;
      return T.project_issues.update(projectId, issueIndex, newIssue);
    } else {
      issueNotFound = true;
    }
  });

  // Save issue changes info
  query = query.then(localIssue => {
    if (issueNotFound) return localIssue;

    var diffs = {};
    // var diffs = utils.keyValueDiffs(localIssue, req.swagger.params.issue.value);
    console.log("Old Issue: "+JSON.stringify(originalIssue));
    console.log("New Issue: "+JSON.stringify(newIssue));
    // console.log("Diff: "+JSON.stringify(diffs));

    // console.log("\n\n\nT.project_issues.update.then(1): "+JSON.stringify(issue));
    // TODO: save actual diff type into the table
    if (Object.keys(diffs).length > 0) {
      var change = Object.assign({
        issue_id: localIssue.id,
        date: new Date().toISOString(),
        author_id: req.user.id
      }, { change: JSON.stringify(utils.produceIssueChangeInfo(diffs)) });
      return T.issue_changes.new(change)
                            .return(localIssue);
    } else {
      return localIssue;
    }
  })

  // Update attachments if should
  query = query.then(localIssue => {
    if (issueNotFound) return localIssue;
    // console.log("\n\n\nT.project_issues.update.then(2): "+JSON.stringify(issue));
    var attachments = newIssue.attachments;
    if (attachments) {
      var promise = Promise.resolve(true);
      promise = promise.then(data => T.issue_attachments.get(newIssue.id))
                        .then(dbAttachments => {
                          console.log("\n\n\aAttachments: "+JSON.stringify(attachments));
                          console.log("\n\n\ndbAttachments: "+JSON.stringify(dbAttachments));
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
      return promise;
    } else {
      return localIssue;
    }
  });

  // Update assignees if should
  query = query.then(localIssue => {
    if (issueNotFound) return localIssue;

    if (_.isEqual(newIssue.assignees, originalIssue.assignees)) {
      return localIssue;
    } else {
      var toRemove = _.differenceBy(originalIssue.assignees, newIssue.assignees, x => x.id);
      var toAdd = _.differenceBy(newIssue.assignees, originalIssue.assignees, x => x.id);

      var localPromise = Promise.resolve(true);
      if (toRemove) {
        for (var i in toRemove) {
          let rem = toRemove[i];
          localPromise = localPromise.then(x => T.issue_assignments.remove(newIssue.id, rem.id));
        }
      }
      if (toAdd) {
        for (var i in toAdd) {
          let add = toAdd[i];
          localPromise = localPromise.then(x => T.issue_assignments.assign(newIssue.id, add.id));
        }
      }
      return localPromise;
    }
  });

  // Get updated issue
  query = query.then(data => {
    if (issueNotFound) return data;
    return T.project_issues.get(projectId, issueIndex);
  });

  // Return result
  query = query.then(localIssue => {
    if (issueNotFound) {
      res.status(404).json({message: "Issue not found."});
    } else {
      res.json(localIssue)
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
