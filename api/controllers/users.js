'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  newUser: newUser,
  getToken: getToken,
  getUserInfo: getUserInfo,
};

function newUser(req, res) {
  if (!req.swagger.params.user.value.email || !req.swagger.params.user.value.password) {
    res.json(403, {message: "You must provide at least an email and password to register!"});
  } else {
    T.users.get_with_email(req.swagger.params.user.value.email)
          .then(data => {
            if (!data) { // User with a given email doesn't exist
              T.users.new(req.swagger.params.user.value).then(info => res.json(info));
            } else { // User with a given email exists
              res.json(403, {message: "User with a given email already exists!"});
            }
          });
  }
}

function getToken(req, res) {
  T.users.get_with_email(req.swagger.params.email.value)
         .then(user => {
           if (!user) {
             res.status(403).json({message: "User with a given email doesn't exist!"});
           } else if (user.password == req.swagger.params.password.value) {
             T.tokens.update_token_for_user_id(user.id).then(token => res.json(token));
           } else {
             res.status(403).json({message: "Wrong password!"});
           }
         });
}

function getUserInfo(req, res) {
  res.json(req.user);
}
