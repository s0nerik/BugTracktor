'use strict';

var T = require('../helpers/sql/tables');
var utils = require('../helpers/utils');
var _ = require('lodash');

module.exports = {
  listRoles: listRoles,
};

function listRoles(req, res) {
  T.project_members.check_member(req.user.id, req.swagger.params.projectId.value)
                   .then(isMember => {
                     if (isMember) {
                         T.project_roles.get(req.swagger.params.projectId.value)
                                        .then(info => res.json(info));
                     } else {
                       res.status(403).json({message: "You must be a project member to view its issue types."});
                     }
                   });
}
