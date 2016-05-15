'use strict';

var crypto = require('crypto');
var Promise = require("bluebird");

/**
 * Delete all null (or undefined) properties from an object.
 * Set 'recurse' to true if you also want to delete properties in nested objects.
 */
function delete_null_properties(obj, recurse) {
    for (var i in obj) {
        if (obj[i] === null) {
            delete obj[i];
        } else if (recurse && typeof obj[i] === 'object') {
            delete_null_properties(obj[i], recurse);
        }
    }
}

/**
 * Delete all null (or undefined) properties from an object.
 * Set 'recurse' to true if you also want to delete properties in nested objects.
 */
function without_nulls(obj, recurse) {
  if (recurse == null) {
    delete_null_properties(obj, true);
  } else {
    delete_null_properties(obj, recurse);
  }
  return obj;
}

/**
 * Delete all specified fields
 */
function without_fields(obj, fields) {
  var newObj = {}
  for (var key in obj) {
    if (!fields || fields.indexOf(key) < 0) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

/**
 * Take only specified fields. Works even for items in Array.
 */
function take_fields(obj, fields) {
  var newObj = obj instanceof Array ? [] : {};
  for (var key in obj) {
    if (obj[key] instanceof Object) {
      newObj[key] = take_fields(obj[key], fields);
    } else if (fields.indexOf(key) >= 0) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

/**
 * Take only specified fields
 */
function insert_without(table, obj, fields) {
  return knex.insert(without_fields(obj, fields))
            .into(table.name)
            .then(ids => table.get(ids[0]))
            .then(data => without_nulls(data, true));
}

function update_where_id(table, object, fields) {
  return knex.where("id", "=", object.id)
              .update(without_nulls(take_fields(object, fields)))
              .table(table.name)
              .then(affectedRows => table.get(object.id))
              .then(data => without_nulls(data, true))
}

function get_with_id(table, id) {
  var query;
  if (id) {
    query = knex.first().where("id", id).from(table.name);
  } else {
    query = knex.select().from(table.name);
  }
  return query.then(data => without_nulls(data, true));
}

function get_with_field_value(table, field, value) {
  var query;
  if (field && value) {
    query = knex.first().where(field, value).from(table.name);
  } else {
    query = knex.select().from(table.name);
  }
  return query.then(data => without_nulls(data, true));
}

function remove_with_id(table, id) {
  var query;
  if (id) {
    query = knex.del().where("id", id).from(table.name);
  } else {
    query = knex.del().from(table.name);
  }
  return query.then(affectedRows => ({"message": "success"}));
}

function table(table) {
  return knex(table.name);
}

var T = {
  projects: {
    name: "Projects",
    fields: ["id", "name", "short_description", "full_description"],
    foreignFields: ["members", "issues"],
    init: table => {
      table.increments("id");
      table.string("name");
      table.string("short_description");
      table.string("full_description");
      table.timestamps();
    },
    new: project => insert_without(T.projects, project, ["id", "members", "issues"]),
    update: project => update_where_id(T.projects, project, ["name", "short_description", "full_description"]),
    get: id => get_with_id(T.projects, id),
    get_user_projects: user => table(T.projects).select()
                                                .whereIn("id", function() {
                                                  this.select('project_id').from(T.project_members.name)
                                                                           .where("user_id", user.id);
                                                })
                                                .then(data => without_nulls(data)),
    remove: id => remove_with_id(T.projects, id),
  },
  issue_types: {
    name: "Issue_Types",
    fields: ["id", "name", "description"],
    init: table => {
      table.increments("id");
      table.string("name");
      table.string("description");
      table.timestamps();
    }
  },
  issues: {
    name: "Issues",
    fields: ["id", "type_id", "short_description", "full_description", "creation_date"],
    foreignFields: ["project", "type", "history"],
    init: table => {
      table.increments("id");

      table.integer("type_id")
           .references("id")
           .inTable(T.issue_types.name);

      table.date("creation_date");
      table.string("short_description");
      table.string("full_description");

      table.timestamps();
    },
    new: issue => insert_without(T.issues, issue, ["id", "project", "type", "history", "creation_date"]),
    update: issue => update_where_id(T.issues, issue, ["type_id", "short_description", "full_description", "creation_date"]),
    get: id => get_with_id(T.issues, id),
    remove: id => remove_with_id(T.issues, id),
  },
  project_issues: {
    name: "Project_Issues",
    fields: ["project_id", "issue_id", "issue_index"],
    foreignFields: ["project", "type", "history"],
    init: table => {
      table.integer("project_id")
           .references("id")
           .inTable(T.projects.name);

      table.integer("issue_id")
           .references("id")
           .inTable(T.issues.name);

      table.integer("issue_index");

      table.primary(["project_id", "issue_id"]);

      table.timestamps();
    },
    new: (projectId, issue) =>
      // Create issue
      T.issues.new(issue)
      // Select last issue index inside a given project
      .then(createdIssue =>
        knex(T.project_issues.name)
        .select(knex.raw('count(*) as cnt'))
        .where('project_id', projectId)
        .then(indexQueryResult => {
          var lastProjectIssueIndex = isNaN(indexQueryResult[0].cnt) ? 0 : parseInt(indexQueryResult[0].cnt);
          console.log("Result: "+lastProjectIssueIndex);
          return [createdIssue, lastProjectIssueIndex+1];
        })
      )
      // Insert new ProjectIssue and return an original issue
      .then(args => table(T.project_issues)
                    .insert({
                      project_id: projectId,
                      issue_id: args[0].id,
                      issue_index: args[1]
                    })
                    .then(data => T.project_issues.get(projectId, args[1]))
      ),
    get: (projectId, issueIndex) => { // projectId -> NotNull
      var where = issueIndex ? { issue_index: issueIndex, project_id: projectId } : { project_id: projectId };
      var query = table(T.project_issues).select().where(where).innerJoin(T.issues.name, "project_issues.issue_id", "issues.id");
      if (issueIndex) query = query.first();
      return query.then(data => without_nulls(take_fields(data, T.issues.fields + ["issue_index"]), true));
    }
  },
  issue_changes: {
    name: "Issue_Changes",
    fields: ["issue_id", "date", "description", "change_type_id", "author_id", "creation_date"],
    foreignFields: ["project", "type", "history"],
    init: table => {
      table.integer("issue_id")
           .references("id")
           .inTable(T.issues.name);

      table.date("date");
      table.string("description");

      table.integer("change_type_id")
           .references("id")
           .inTable(T.issue_change_types.name);
      table.integer("author_id")
           .references("id")
           .inTable(T.project_members.name);

      table.primary(["issue_id", "date"]);

      table.timestamps();
    },
    get: (issueId, date) => { // issueId -> NotNull
      var where = date ? { "date": date, "issue_id": issueId } : { "issue_id": issueId };
      var query = table(T.issue_changes).select().where(where);
      if (date) query = query.first();
      return query.then(data => without_nulls(data, true));
    },
  },
  issue_change_types: {
    name: "Issue_Change_Types",
    fields: ["id", "project_id", "name", "description"],
    init: table => {
      table.increments("id");
      table.integer("project_id")
           .references("id")
           .inTable(T.projects.name);

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  roles: {
    name: "Roles",
    fields: ["id", "name", "description"],
    init: table => {
      table.increments("id");

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  permissions: { // Predefined permissions table
    name: "Permissions",
    fields: ["name", "request_method", "request_url"],
    clearOnInit: true,
    init: table => {
      table.string("name");

      table.string("request_method");
      table.string("request_url");

      table.primary("name");
    },
    afterInit: () => {
      var permissions = require('./permissions');
      return table(T.permissions).insert(permissions.asArray());
    },
    get_by_token: (token, projectId) =>
      table(T.permissions)
        .distinct(T.permissions.name+".name")
        .innerJoin(T.tokens.name, T.tokens.name+".token", token)
        .innerJoin(T.project_member_roles.name, function () {this.on(T.project_member_roles.name+".user_id", T.tokens.name+".user_id")
                                                                  .andOn(T.project_member_roles.name+".project_id", projectId)})
        .innerJoin(T.role_permissions.name, T.role_permissions.name+".permission_name", T.permissions.name+".name")
        .then(data => without_nulls(data)),
  },
  role_permissions: {
    name: "role_permissions",
    fields: ["role_id", "permission_name"],
    init: table => {
      table.integer("role_id")
           .references("id")
           .inTable(T.roles.name);
      table.string("permission_name")
           .references("name")
           .inTable(T.permissions.name);

      table.primary(["role_id", "permission_name"]);
    },
  },
  user_permissions: {
    name: "user_permissions",
    fields: ["user_id", "permission_name"],
    init: table => {
      table.integer("user_id")
           .references("id")
           .inTable(T.users.name);
      table.string("permission_name")
           .references("name")
           .inTable(T.permissions.name);

      table.primary(["user_id", "permission_name"]);
    },
  },
  users: {
    name: "Users",
    fields: ["id", "email", "password", "nickname", "real_name"],
    init: table => {
      table.increments("id");
      table.string("email");
      table.string("password");
      table.string("nickname");
      table.string("real_name");

      table.timestamps();
    },
    new: user => insert_without(T.users, user, ["id"]),
    get: id => get_with_id(T.users, id),
    get_with_email: email => get_with_field_value(T.users, "email", email),
  },
  project_members: {
    name: "Project_Members",
    fields: ["user_id", "project_id", "join_date"],
    init: table => {
      table.integer("user_id")
           .references("id")
           .inTable(T.users.name);

      table.integer("project_id")
           .references("id")
           .inTable(T.projects.name);

      table.date("join_date");

      table.primary(["user_id", "project_id"]);
    },
  },
  project_member_roles: {
    name: "Project_Member_Roles",
    fields: ["user_id", "project_id", "role_id"],
    init: table => {
      table.integer("user_id")
           .references("id")
           .inTable(T.users.name);

      table.integer("project_id")
           .references("id")
           .inTable(T.projects.name);

      table.integer("role_id")
           .references("id")
           .inTable(T.roles.name);

      table.primary(["user_id", "project_id", "role_id"]);

      table.timestamps();
    },
  },
  tokens: {
    name: "tokens",
    fields: ["user_id", "token", "updated_at"],
    init: table => {
      table.integer("user_id")
           .references("id")
           .inTable(T.users.name);

      table.string("token");
      table.dateTime("updated_at");

      table.primary(["user_id"]);
    },
    update_token_for_user_id: userId => {
      var token = {
        user_id: userId,
        token: crypto.randomBytes(64).toString('hex'),
        updated_at: new Date().toISOString()
      };
      var query = table(T.tokens).where("user_id", userId);
      return query.then(data => {
        if (Object.keys(data).length === 0) { // Token not found, let's create a new one!
          return table(T.tokens).insert(token);
        } else { // Token found, let's update it!
          return table(T.tokens).where("user_id", userId).update(token);
        }
      }).return(take_fields(token, ["token"]));
    },
    get_for_user_id: userId => get_with_field_value(T.tokens, "user_id", userId),
    get_user_by_token: token => table(T.tokens).first()
                                              .innerJoin(T.users.name, "tokens.user_id", "users.id")
                                              .then(data => without_nulls(take_fields(data, T.users.fields))),
  },

  /*
   * Global database functions
   */
  createAllTables: function(knex) {
    var query = Promise.resolve(true);
    for (var key in T) {
      if (T.hasOwnProperty(key) && !(T[key] instanceof Function)) {
        let tbl = T[key];
        if (tbl.clearOnInit) query = query.then(data => knex.schema.dropTableIfExists(tbl.name));
        query = query.then(data => knex.schema.createTableIfNotExists(tbl.name, tbl.init));
        if (tbl.afterInit) query = query.then(data => tbl.afterInit());
      }
    }
    return query;
  },
  dropAllTables: function(knex) {
    var query = Promise.resolve(true);
    for (var key in T) {
      if (T.hasOwnProperty(key) && !(T[key] instanceof Function)) {
        query = query.then(data => knex.schema.dropTableIfExists(T[key].name));
      }
    }
    return query;
  }
}

module.exports = T;
