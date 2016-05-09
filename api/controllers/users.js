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
  T.users.get_with_email(req.swagger.params.email.value)
         .then(info => {
           if (info.password == req.swagger.params.password.value) {
             T.tokens.update_token_for_user_id(info.id).then(data => res.json(data));
           } else {
             res.status(403).json({message: "Wrong password!"});
           }
         });
}
