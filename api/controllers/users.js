'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  newUser: newUser,
  getToken: getToken,
};

function newUser(req, res) {
  T.users.get_with_email(req.swagger.params.user.value.email)
        .then(data => {
          if (!data) { // User with a given email doesn't exist
            T.users.new(req.swagger.params.user.value).then(info => res.json(info));
          } else { // User with a given email exists
            res.json(403, {message: "User with a given email already exists!"});
          }
        });
}

function getToken(req, res) {
  T.users.get_with_email(req.swagger.params.email.value)
         .then(info => {
           if (!info) {
             res.status(403).json({message: "User with a given email doesn't exist!"});
           } else if (info.password == req.swagger.params.password.value) {
             T.tokens.update_token_for_user_id(info.id).then(data => res.json(data));
           } else {
             res.status(403).json({message: "Wrong password!"});
           }
         });
}
