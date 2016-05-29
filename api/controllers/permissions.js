'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  getPermissions: getPermissions,
};

function getPermissions(req, res) {
  T.permissions.get_by_user_id_and_project(req.user.id, req.swagger.params.projectId.value)
               .then(info => {
                 var result = [];
                 for (var i in info) {
                   result.push({name: info[i]});
                 }
                 res.json(result);
               });
}
