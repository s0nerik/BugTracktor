'use strict';

var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
var cors = require('cors');
var tables = require('./api/helpers/sql/tables');
var methodPermissions = require('./api/helpers/method_permissions');
var Promise = require("bluebird");
var winston = require('winston');
var expressWinston = require('express-winston');
var _ = require('lodash');
var mung = require('express-mung');
var check = require('check-types');

module.exports = app; // for testing

// expressWinston.requestWhitelist.push('body');
// expressWinston.responseWhitelist.push('body');
// app.use(expressWinston.logger({
//   transports: [
//     new winston.transports.Console({
//       json: true,
//       colorize: true
//     })
//   ],
//   requestFilter: function (req, propName) { return _.get(req, propName); },
//   responseFilter: function (res, propName) { return _.get(res, propName); }
// }));

var containsAll = function (original, array) {
  return array.every(function(v,i) {
    return original.indexOf(v) !== -1;
  })
}

var config = {
  appRoot: __dirname, // required config
  swaggerSecurityHandlers: {
    api_key: (req, authOrSecDef, scopesOrApiKey, callback) => {
      var isTokenValid = false;

      var query = tables.tokens.check_valid(scopesOrApiKey)
                               .then(isValid => isTokenValid = isValid);

      query = query.then(data => tables.tokens.get_user_by_token(scopesOrApiKey))
                   .then(user => req.user = user);

      if (req.swagger.params && req.swagger.params.projectId) {
        query = query.then(data => tables.permissions.get_by_token(scopesOrApiKey, req.swagger.params.projectId.value));
      } else {
        query = query.then(data => tables.permissions.get_by_token(scopesOrApiKey, 0));
      }

      return query.then(permissions => { // callback with no arguments if allow, and with object if disallow
        // if token is invalid - return a message with explanation.
        if (!isTokenValid) {
          callback({message: "Auth Token isn't valid."});
        // check user's permissions
        } else if (!methodPermissions[req.swagger.operation.operationId] || (permissions && containsAll(permissions, methodPermissions[req.swagger.operation.operationId]))) {
          callback();
        } else {
          callback({});
        }
      });
    }
  }
};

SwaggerExpress.create(config, function(err, swaggerExpress) {
  if (err) { throw err; }

  // if (process.env.DEV) {
    function updateObject(obj) {
      for (var i in obj) {
        if (i.startsWith("date") || i.endsWith("_date") || i.indexOf("_date_") > -1) {
          obj[i] = new Date(obj[i]).toISOString();
        } else if (i.indexOf("password") > -1) {
          delete obj[i];
        } else if (obj[i] instanceof Object) {
          updateObject(obj[i]);
        }
      }
    }
    function redact(body, req, res) {
      updateObject(body);
    }
    app.use(mung.json(redact));
  // }

  // install middleware
  swaggerExpress.register(app);

  var port = process.env.PORT || 10010;
  app.listen(port);
});

app.use(cors());

if (process.env.DEV) {
  GLOBAL.knex = require('knex')({
    client: 'sqlite3',
    connection: {
      filename: "./db.sqlite"
    },
    // useNullAsDefault: true,
    debug: true
  });
} else if (process.env.JAWSDB_URL) {
  GLOBAL.knex = require('knex')({
    client: 'mysql',
    connection: process.env.JAWSDB_URL,
    // useNullAsDefault: true,
    debug: true
  });
} else if (process.env.JAWSDB_MARIA_URL) {
  GLOBAL.knex = require('knex')({
    client: 'mysql',
    connection: process.env.JAWSDB_MARIA_URL,
    searchPath: 'knex,public',
    // useNullAsDefault: true,
    debug: true
  });
} else if (process.env.CLEARDB_DATABASE_URL) {
  GLOBAL.knex = require('knex')({
    client: 'mysql',
    connection: process.env.CLEARDB_DATABASE_URL,
    searchPath: 'knex,public',
    // useNullAsDefault: true,
    debug: true
  });
} else {
  GLOBAL.knex = require('knex')({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    searchPath: 'knex,public',
    // useNullAsDefault: true,
    debug: true
  });
}

var prepareQuery = Promise.resolve(true);
if (process.env.DROP_TABLES) {
  prepareQuery = prepareQuery.then(data => tables.dropAllTables(knex))
                             .then(data => tables.createAllTables(knex))
                             .then(data => tables.fillWithTestData(knex))
} else {
  prepareQuery = prepareQuery.then(data => tables.createAllTables(knex));
}

Date.prototype.addMinutes = function(minutes) {
    var copiedDate = new Date(this.getTime());
    return new Date(copiedDate.getTime() + minutes * 60000);
}
