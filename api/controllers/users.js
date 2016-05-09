'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  newUser: newUser,
  getToken: getToken,
};

function newUser(req, res) {
  T.users.new(req.swagger.params.user.value).then(info => res.json(info));
}

function getToken(req, res) {
  T.users.get(req.swagger.params.user.value.id)
         .then(info => {
           console.log(info);
           res.json(info);
         });
}
