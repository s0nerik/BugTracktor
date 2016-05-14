'use strict';

var SwaggerExpress = require('swagger-express-mw');
var app = require('express')();
var cors = require('cors');
var tables = require('./api/helpers/sql/tables');
var methodPermissions = require('./api/helpers/method_permissions');

module.exports = app; // for testing

var config = {
  appRoot: __dirname, // required config
  swaggerSecurityHandlers: {
    api_key: (req, authOrSecDef, scopesOrApiKey, callback) => {
      var query;
      if (req.swagger.params && req.swagger.params.projectId) {
        query = tables.permissions.get_by_token(scopesOrApiKey, req.swagger.params.projectId.value)
      } else {
        query = tables.permissions.get_by_token(scopesOrApiKey, 0)
      }

      return query.then(data => {
         // callback with no arguments if allow, and with object if disallow
        if (data.indexOf(methodPermissions[req.swagger.operation.operationId]) > -1) {
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

  // install middleware
  swaggerExpress.register(app);

  var port = process.env.PORT || 10010;
  app.listen(port);
});

app.use(cors());

GLOBAL.knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: "./db.sqlite"
  },
  // useNullAsDefault: true,
  debug: true
});

// tables.dropAllTables(knex);
tables.createAllTables(knex);

Date.prototype.addMinutes = function(minutes) {
    var copiedDate = new Date(this.getTime());
    return new Date(copiedDate.getTime() + minutes * 60000);
}
