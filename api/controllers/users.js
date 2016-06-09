'use strict';

var T = require('../helpers/sql/tables');

module.exports = {
  newUser: newUser,
  getToken: getToken,
  getUserInfo: getUserInfo,
  listUsers: listUsers,
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

function listUsers(req, res) {
  var limit = req.swagger.params.limit.value;
  var offset = req.swagger.params.offset.value;
  var name = req.swagger.params.name.value;
  var nickname = req.swagger.params.nickname.value;
  var email = req.swagger.params.email.value;

  var criteria;
  if (name || nickname || email) {
    criteria = function() {
      var localCriteria;
      if (name) {
        localCriteria = this.where('real_name', 'like', "%"+name+"%");
        if (nickname)
          localCriteria = localCriteria.orWhere('nickname', 'like', "%"+nickname+"%");
        if (email)
          localCriteria = localCriteria.orWhere('email', 'like', "%"+email+"%");
      } else if (nickname) {
        localCriteria = this.where('nickname', 'like', "%"+nickname+"%");
        if (email)
          localCriteria = localCriteria.orWhere('email', 'like', "%"+email+"%");
      } else if (email) {
        localCriteria = this.where('email', 'like', "%"+email+"%");
      }

      return localCriteria;
    }
  }

  T.users.get_all(limit, offset, criteria)
          .then(data => {
            // console.log("get_all: "+JSON.stringify(data));
            res.json(data);
          });
}
