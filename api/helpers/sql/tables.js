'use strict';

var crypto = require('crypto');
var Promise = require("bluebird");
var permissions = require("../sql/permissions");

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
    if (Array.isArray(obj[key])) {
      if (obj[key].length > 0) {
        newObj[key] = take_fields(obj[key], fields);
      }
    } else if (obj[key] instanceof Object) {
      if (Object.keys(obj[key]).length > 0) {
        newObj[key] = take_fields(obj[key], fields);
      }
    } else if (fields.indexOf(key) >= 0) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

function to_array_of_values(arrayOfObjects) {
  var arr = [];
  for (var obj in arrayOfObjects) {
    if (arrayOfObjects[obj] instanceof Object) {
      for (var key in arrayOfObjects[obj]) {
        arr.push(arrayOfObjects[obj][key]);
      }
    } else {
      arr.push(arrayOfObjects[obj]);
    }
  }
  return arr;
}

/**
 * Insert without given fields.
 */
function insert_without(table, obj, fields) {
  return knex.insert(without_fields(obj, fields))
            .into(table.name)
            .then(ids => table.get(ids[0]))
            .then(data => without_nulls(data, true));
}

/**
 * Insert only given fields.
 */
function insert_only(table, obj, fields) {
  return knex.insert(take_fields(obj, fields))
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
  users: {
    name: "users",
    fields: ["id", "email", "password", "nickname", "real_name", "avatar_url"],
    init: table => {
      table.increments("id");
      table.string("email");
      table.string("password");
      table.string("nickname");
      table.string("real_name");
      table.string("avatar_url");
    },
    new: user => insert_without(T.users, user, ["id"]),
    get: id => get_with_id(T.users, id),
    get_with_email: email => get_with_field_value(T.users, "email", email),
  },
  projects: {
    name: "projects",
    fields: ["id", "name", "short_description", "full_description"],
    foreignFields: ["members", "issues"],
    init: table => {
      table.increments("id");
      table.string("name");
      table.string("short_description");
      table.string("full_description");
    },
    new: (userId, project) => insert_without(T.projects, project, ["id", "members", "issues"])
                                .then(data => T.project_creators.new(userId, data.id).return(data)),
    update: project => update_where_id(T.projects, project, ["name", "short_description", "full_description"]),
    get: id => get_with_id(T.projects, id),
    get_user_projects: user => table(T.projects).select()
                                                .whereIn("id", function() {
                                                  this.select('project_id')
                                                      .from(T.project_members.name)
                                                      .where("user_id", user.id)
                                                      .union(function() {
                                                        this.select("project_id")
                                                            .from(T.project_creators.name)
                                                            .where("user_id", user.id)
                                                      })
                                                })
                                                .then(data => without_nulls(data)),
    get_user_project_by_id: (user, projectId) => table(T.projects).first()
                                                                  .whereIn("id", function() {
                                                                    this.select('project_id')
                                                                        .from(T.project_members.name)
                                                                        .where("user_id", user.id)
                                                                        .union(function() {
                                                                          this.select("project_id")
                                                                              .from(T.project_creators.name)
                                                                              .where("user_id", user.id)
                                                                        })
                                                                  })
                                                                  .andWhere("id", projectId)
                                                                  .then(data => without_nulls(data)),
    remove: id => remove_with_id(T.projects, id).then(data => T.project_creators.remove_by_project_id(id)),
  },
  project_creators: {
    name: "project_creators",
    fields: ["user_id", "project_id"],
    init: table => {
      table.integer("user_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.users.name);
      table.integer("project_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.projects.name);

      table.primary(["user_id", "project_id"]);
    },
    new: (userId, projectId) => table(T.project_creators).insert({user_id: userId, project_id: projectId}),
    remove_by_project_id: projectId => table(T.project_creators).where("project_id", projectId).del(),
    remove_by_user_id: userId => table(T.project_creators).where("user_id", userId).del(),
    is_creator: (userId, projectId) => table(T.project_creators).where("user_id", userId)
                                                                .andWhere("project_id", projectId)
                                                                .then(data => !(!data || data.length === 0)),
    get_creator_by_project_id: projectId => table(T.users).first()
                                                          .where("id", function () {
                                                            this.first("user_id")
                                                                .from(T.project_creators.name)
                                                                .where("project_id", projectId)
                                                          })
                                                          .then(data => without_nulls(without_fields(data, ["password"]))),
  },
  issue_types: {
    name: "issue_types",
    fields: ["id", "name", "description"],
    init: table => {
      table.increments("id");
      table.string("name");
      table.string("description");
    },
    new: issueType => insert_only(T.issue_types, issueType, ["name", "description"]),
    get: issueTypeId => get_with_id(T.issue_types, issueTypeId),
    update: issueType => update_where_id(T.issue_types, issueType, ["name", "description"]),
  },
  project_issue_types: {
    name: "project_issue_types",
    fields: ["project_id", "issue_type_id"],
    init: table => {
      table.integer("project_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable(T.projects.name);
      table.integer("issue_type_id")
            .unsigned()
            .notNullable()
            .references("id")
            .inTable(T.issue_types.name);

      table.primary(["project_id", "issue_type_id"]);
    },
    get_for_project_id: projectId => table(T.project_issue_types)
                                      .select(T.issue_types.fields)
                                      .where("project_id", projectId)
                                      .innerJoin(T.issue_types.name, "project_issue_types.issue_type_id", "issue_types.id"),
    new: (projectId, issueTypeId) => {
      var obj = {project_id: projectId, issue_type_id: issueTypeId};
      return table(T.project_issue_types).insert(obj).return(obj);
    },
  },
  issues: {
    name: "issues",
    fields: ["id", "type_id", "short_description", "full_description", "creation_date"],
    foreignFields: ["project", "type", "history"],
    init: table => {
      table.increments("id");

      table.integer("type_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.issue_types.name);

      table.date("creation_date");
      table.string("short_description");
      table.string("full_description");
    },
    new: issue => insert_without(T.issues, issue, ["id", "project", "type", "history", "creation_date"]),
    update: issue => update_where_id(T.issues, issue, ["type_id", "short_description", "full_description", "creation_date"]),
    get: id => get_with_id(T.issues, id),
    remove: id => remove_with_id(T.issues, id),
  },
  issue_assignments: {
    name: "issue_assignments",
    fields: ["issue_id", "user_id"],
    init: table => {
      table.integer("issue_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.issues.name);

      table.integer("user_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.users.name);

      table.primary(["issue_id", "user_id"]);
    },
    assign: (issueId, userId) => table(T.issue_assignments).insert({ issue_id: issueId, user_id: userId }),
    remove: (issueId, userId) => table(T.issue_assignments).where({ issue_id: issueId, user_id: userId }).del(),
  },
  project_issues: {
    name: "project_issues",
    fields: ["project_id", "issue_id", "issue_index"],
    foreignFields: ["project", "type", "history"],
    init: table => {
      table.integer("project_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.projects.name);

      table.integer("issue_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.issues.name);

      table.integer("issue_index");

      table.primary(["project_id", "issue_id"]);
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
  roles: {
    name: "roles",
    fields: ["id", "name", "description"],
    init: table => {
      table.increments("id");

      table.string("name");
      table.string("description");
    },
    new: role => insert_only(T.roles, role, ["name", "description"]),
    get: roleId => get_with_id(T.roles, roleId),
    update: role => update_where_id(T.roles, role, ["name", "description"]),
  },
  permissions: { // Predefined permissions table
    name: "permissions",
    fields: ["name", "request_method", "request_url"],
    clearOnInit: true,
    init: table => {
      table.string("name").notNullable().primary();

      table.string("request_method");
      table.string("request_url");

      // table.primary("name");
    },
    afterInit: () => {
      var permissions = require('./permissions');
      return table(T.permissions).insert(permissions.asArray());
    },
    get_by_token: (token, projectId) =>
      table(T.role_permissions)
        .distinct("permission_name")
        .innerJoin(T.tokens.name, T.tokens.name+".token", knex.raw('?', [token]))
        .innerJoin(T.project_member_roles.name, function () {this.on(T.project_member_roles.name+".user_id", T.tokens.name+".user_id")
                                                                  .andOn(T.project_member_roles.name+".project_id", knex.raw('?', [projectId]))})
        .union(function() {
          this.distinct("permission_name")
              .from(T.user_permissions.name)
              .where("user_id", function() {
                this.select("user_id")
                    .from(T.tokens.name)
                    .where("token", knex.raw('?', [token]))
              })
        })
        .then(data => without_nulls(to_array_of_values(data))),
    get_by_user_id_and_project: (userId, projectId) => {
      if (projectId) {
        return table(T.role_permissions)
          .distinct("permission_name")
          .innerJoin(T.project_member_roles.name, function () {this.on(T.project_member_roles.name+".user_id", knex.raw('?', [userId]))
                                                                   .andOn(T.project_member_roles.name+".project_id", knex.raw('?', [projectId]))})
          .union(function() {
            this.distinct("permission_name")
                .from(T.user_permissions.name)
                .where("user_id", userId)
          })
          .then(data => without_nulls(to_array_of_values(data)))
      } else {
        return table(T.user_permissions)
          .distinct("permission_name")
          .where("user_id", userId)
          .then(data => without_nulls(to_array_of_values(data)))
      }
    },
  },
  user_permissions: {
    name: "user_permissions",
    fields: ["user_id", "permission_name"],
    init: table => {
     table.integer("user_id")
           .unsigned()
           .notNullable()
          .references("id")
          .inTable(T.users.name);
     table.string("permission_name")
          .notNullable()
          .references("name")
          .inTable(T.permissions.name);
     table.primary(["user_id", "permission_name"]);
    },
    give_permission: (userId, permissionName) => table(T.user_permissions).insert({user_id: userId, permission_name: permissionName}),
    deny_permission: (userId, permissionName) => table(T.user_permissions).where('user_id', userId).andWhere('permission_name', permissionName).del(),
  },
  role_permissions: {
    name: "role_permissions",
    fields: ["role_id", "permission_name"],
    init: table => {
      table.integer("role_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.roles.name);
      table.string("permission_name")
            .notNullable()
           .references("name")
           .inTable(T.permissions.name);

      table.primary(["role_id", "permission_name"]);
    },
    give_permission: (roleId, permissionName) => table(T.role_permissions).insert({role_id: roleId, permission_name: permissionName}),
    deny_permission: (roleId, permissionName) => table(T.role_permissions).where('role_id', roleId).andWhere('permission_name', permissionName).del(),
  },
  project_members: {
    name: "project_members",
    fields: ["user_id", "project_id", "join_date"],
    init: table => {
      table.integer("user_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.users.name);

      table.integer("project_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.projects.name);

      table.date("join_date");

      table.primary(["user_id", "project_id"]);
    },
    make_member: (userId, projectId) => table(T.project_members).insert({user_id: userId, project_id: projectId}),
    deny_member: (userId, projectId) => table(T.project_members).where('user_id', userId).andWhere('project_id', projectId).del(),
    check_member: (userId, projectId) => table(T.project_members).first()
                                                                 .where("user_id", userId)
                                                                 .andWhere("project_id", projectId)
                                                                 .then(data => {
                                                                   if (data) return true;
                                                                   else return false;
                                                                 }),
    get_members_by_project_id: projectId =>
      table(T.users)
        .distinct(T.users.fields)
        .innerJoin(T.project_members.name, function () {
          this.on(T.project_members.name+".user_id", T.users.name+".id")
              .andOn(T.project_members.name+".project_id", knex.raw('?', [projectId]))
        })
        .then(data => without_nulls(data)),
  },
  project_member_roles: {
    name: "project_member_roles",
    fields: ["user_id", "project_id", "role_id"],
    init: table => {
      table.integer("user_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.users.name);

      table.integer("project_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.projects.name);

      table.integer("role_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.roles.name);

      table.primary(["user_id", "project_id", "role_id"]);
    },
    give_role: (userId, projectId, roleId) => table(T.project_member_roles).insert({user_id: userId, project_id: projectId, role_id: roleId}),
    deny_role: (userId, projectId, roleId) => table(T.project_member_roles).where('user_id', userId)
                                                                           .andWhere('project_id', projectId)
                                                                           .andWhere('role_id', roleId)
                                                                           .del(),
    get_all_member_role_ids_for_project: projectId =>
      table(T.project_member_roles)
        .distinct(["user_id", "role_id"])
        .where("project_id", projectId)
        .then(data => without_nulls(data)),
    get_all_user_roles_in_project: (projectId, userId) =>
      table(T.roles)
        .select()
        .whereIn("id", function() {
          this.distinct("role_id")
              .where("project_id", projectId)
              .andWhere("user_id", userId)
              .from(T.project_member_roles.name)
        })
        .then(data => without_nulls(data)),
  },
  issue_changes: {
    name: "issue_changes",
    fields: ["issue_id", "date", "author_id", "change"],
    foreignFields: ["project", "type"],
    init: table => {
      table.integer("issue_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.issues.name);

     table.integer("author_id")
          .unsigned()
          .notNullable()
          .references("user_id")
          .inTable(T.project_members.name);

      table.dateTime("date").notNullable();

      table.string("change");

      table.primary(["issue_id", "date"]);
    },
    get: (issueId, date) => { // issueId -> NotNull
      var where = date ? { "date": date, "issue_id": issueId } : { "issue_id": issueId };
      var query = table(T.issue_changes).select().where(where);
      if (date) query = query.first();
      return query.then(data => without_nulls(data, true));
    },
    new: change => {
      var onlyWithNeededFields = take_fields(change, T.issue_changes.fields);
      return table(T.issue_changes).insert(onlyWithNeededFields).return(onlyWithNeededFields)
    },
  },
  tokens: {
    name: "tokens",
    fields: ["user_id", "token", "updated_at"],
    init: table => {
      table.integer("user_id")
            .unsigned()
            .notNullable()
           .references("id")
           .inTable(T.users.name);

      table.string("token");
      table.dateTime("updated_at");

      table.primary("user_id");
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
                                               .innerJoin(T.users.name, function () {
                                                 this.on("tokens.user_id", "users.id")
                                                     .andOn("tokens.token", knex.raw('?', [token]))
                                               })
                                              .then(data => without_nulls(take_fields(data, T.users.fields))),
    check_valid: token => table(T.tokens).first()
                                         .where("token", token)
                                         .then(tokenData => {
                                           if (tokenData) {
                                             var lastUpdatedDate = new Date(tokenData.updated_at);
                                             var currentDate = new Date();
                                             var diffHours = parseInt((currentDate - lastUpdatedDate) / (1000 * 60 * 60));
                                             console.log("diffHours: "+diffHours);
                                             // If difference is more than 6 hours - token is invalid
                                             return diffHours < 6;
                                           } else {
                                             return false;
                                           }
                                         }),
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
    query = query.then(data => knex.schema.raw("SET FOREIGN_KEY_CHECKS = 0"));
    for (var key in T) {
      if (T.hasOwnProperty(key) && !(T[key] instanceof Function)) {
        let tbl = T[key];
        query = query.then(data => knex.schema.dropTableIfExists(tbl.name));
      }
    }
    query = query.then(data => knex.schema.raw("SET FOREIGN_KEY_CHECKS = 1"));
    return query;
  },
  fillWithTestData: function(knex) {
    var randomDate = function(start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    var query = Promise.resolve(true);

    var users = [
      {email: "developer@gmail.com",    password: "1", nickname: "vasya_pupkin",  real_name: "Vasya Pupkin",    avatar_url: "http://api.adorable.io/avatar/256/1"   },
      {email: "developer2@gmail.com",   password: "1", nickname: "ronnie_c",      real_name: "Ronnie Coleman",  avatar_url: "http://api.adorable.io/avatar/256/2"   },
      {email: "developer3@gmail.com",   password: "1", nickname: "andy_james",    real_name: "Andy James",      avatar_url: "http://api.adorable.io/avatar/256/3"   },
      {email: "developer4@gmail.com",   password: "1", nickname: "hetfield",      real_name: "James Hetfield",  avatar_url: "http://api.adorable.io/avatar/256/4"   },
      {email: "developer5@gmail.com",   password: "1", nickname: "hammett",       real_name: "Kirk Hammett",    avatar_url: "http://api.adorable.io/avatar/256/5"   },
      {email: "manager@gmail.com",      password: "1", nickname: "lars_ulrich",   real_name: "Lars Ulrich",     avatar_url: "http://api.adorable.io/avatar/256/6"   },
      {email: "manager2@gmail.com",     password: "1", nickname: "dave_mustaine", real_name: "Dave Mustaine",   avatar_url: "http://api.adorable.io/avatar/256/7"   },
      {email: "manager3@gmail.com",     password: "1", nickname: "corey_taylor,", real_name: "Corey Taylor",    avatar_url: "http://api.adorable.io/avatar/256/8"   },
      {email: "manager4@gmail.com",     password: "1", nickname: "danny_worsnop", real_name: "Danny Worsnop",   avatar_url: "http://api.adorable.io/avatar/256/9"   },
      {email: "manager5@gmail.com",     password: "1", nickname: "denis_stoff",   real_name: "Denis Stoff",     avatar_url: "http://api.adorable.io/avatar/256/10"  },
      {email: "tester@gmail.com",       password: "1", nickname: "ben_bruce",     real_name: "Ben Bruce",       avatar_url: "http://api.adorable.io/avatar/256/11"  },
      {email: "tester2@gmail.com",      password: "1", nickname: "kellin_quinn",  real_name: "Kellin Quinn",    avatar_url: "http://api.adorable.io/avatar/256/12"  },
      {email: "tester3@gmail.com",      password: "1", nickname: "johnny_cash,",  real_name: "Johnny Cash",     avatar_url: "http://api.adorable.io/avatar/256/13"  },
      {email: "tester4@gmail.com",      password: "1", nickname: "vic_fuentes",   real_name: "Vic Fuentes",     avatar_url: "http://api.adorable.io/avatar/256/14"  },
      {email: "tester5@gmail.com",      password: "1", nickname: "ronnie_radke",  real_name: "Ronnie Radke",    avatar_url: "http://api.adorable.io/avatar/256/15"  },
      {email: "admin@gmail.com",        password: "1", nickname: "oxxxymiron",    real_name: "Miron Fedorov",   avatar_url: "http://api.adorable.io/avatar/256/16"  },
      {email: "user@gmail.com",         password: "1", nickname: "jesse_leach",   real_name: "Jesse Leach",     avatar_url: "http://api.adorable.io/avatar/256/17"  },
      {email: "user2@gmail.com",        password: "1", nickname: "adam_d",        real_name: "Adam Dutkiewicz", avatar_url: "http://api.adorable.io/avatar/256/18"  },
      {email: "user3@gmail.com",        password: "1", nickname: "justin_foley",  real_name: "Justin Foley",    avatar_url: "http://api.adorable.io/avatar/256/19"  },
      {email: "user4@gmail.com",        password: "1", nickname: "howard_jones",  real_name: "Howard Jones",    avatar_url: "http://api.adorable.io/avatar/256/20"  },
      {email: "user5@gmail.com",        password: "1", nickname: "joel_s",        real_name: "Joel Stroetzel",  avatar_url: "http://api.adorable.io/avatar/256/21"  }
    ];

    var projects = [
      {
        name: "DNO Project",
        short_description: "An application for doing everything possible on Earth.",
        full_description: "A project where everything that is possible will be implemented for a budget of $50."
      },
      {
        name: "Metallica",
        short_description: "Metallica is an American heavy metal band formed in Los Angeles, California.",
        full_description: "Metallica was formed in 1981 when vocalist/guitarist James Hetfield responded to an advertisement posted by drummer Lars Ulrich in a local newspaper. The band's current line-up comprises founding members Hetfield and Ulrich, longtime lead guitarist Kirk Hammett and bassist Robert Trujillo. Guitarist Dave Mustaine and bassists Ron McGovney, Cliff Burton and Jason Newsted are former members of the band."
      },
      {
        name: "Escape the Fate",
        short_description: "Escape the Fate is an American rock band from Las Vegas, Nevada, formed in 2005 and originally from Pahrump, Nevada.",
        full_description: "They are signed to Eleven Seven Music. The group consists of Robert Ortiz (drummer), Craig Mabbitt (lead vocalist), TJ Bell (rhythm guitarist and vocalist), Kevin Gruft (lead guitarist) and touring musician Max Georgiev (bassist). As of 2013, Ortiz is the last founding member in the current line up of the group."
      },
      {
        name: "Megadeth",
        short_description: "Megadeth is an American thrash metal band from Los Angeles, California.",
        full_description: "The group was formed in 1983 by guitarist Dave Mustaine and bassist David Ellefson, shortly after Mustaine's dismissal from Metallica. A pioneer of the American thrash metal scene, the band is credited as one of the genre's \"big four\" with Anthrax, Metallica and Slayer, responsible for thrash metal's development and popularization. Megadeth plays in a technical style, featuring fast rhythm sections and complex arrangements. Themes of death, war, politics and religion are prominent in the group's lyrics."
      },
      {
        name: "As I Lay Dying",
        short_description: "As I Lay Dying is an American metalcore band from San Diego, California.",
        full_description: "Founded in 2000 by vocalist Tim Lambesis, the establishment of the band's first full lineup, which included drummer Jordan Mancino, occurred in 2001. As I Lay Dying has released six albums, one split album, and two compilation albums."
      },
      {
        name: "Of Mice & Men",
        short_description: "Of Mice & Men is an American metalcore band from Orange County, California.",
        full_description: "The band's lineup currently consists of vocalist Austin Carlile, lead guitarist Phil Manansala, rhythm guitarist and backing vocalist Alan Ashby, bassist and vocalist Aaron Pauley and drummer Valentino Arteaga. The group was founded by Austin Carlile and Jaxin Hall in mid-2009 after Carlile's departure from Attack Attack!. Since 2009 the band has released 3 studio albums. The name of the band is derived from John Steinbeck's novel of the same title."
      }
    ];

    var roles = [{name: "Admin", description: "Admin"}];
    var projectRoles = [
      {name: "Developer", description: "Developer"},
      {name: "Manager", description: "Manager"},
      {name: "Tester", description: "Tester"}
    ];
    for (var i in projects) {
      Array.prototype.push.apply(roles, projectRoles);
    }

    var rolePermissions = [];
    var giveRolePermissions = (roleId, permissions) => {
      for (var i in permissions) {
        rolePermissions.push({role_id: roleId, permission_name: permissions[i]});
      }
    }
    // Give admin all permissions
    var allPermissions = permissions.asArray().map(it => it.name);
    giveRolePermissions(1, allPermissions);
    // Give permissions to developers
    [2, 2+3, 2+6, 2+9, 2+12, 2+15].forEach(it => giveRolePermissions(it, ["list_projects", "get_project", "list_issues", "get_issue", "close_issue"]));
    // Give permissions to managers
    [3, 3+3, 3+6, 3+9, 3+12, 3+15].forEach(it => giveRolePermissions(it, allPermissions));
    // Give permissions to testers
    [4, 4+3, 4+6, 4+9, 4+12, 4+15].forEach(it => giveRolePermissions(it, allPermissions));

    var userPermissions = [];
    var giveUserPermissions = (userId, permissions) => {
      for (var i in permissions) {
        userPermissions.push({user_id: userId, permission_name: permissions[i]});
      }
    }
    // Give managers all permissions
    for (i = 6; i < 11; i++) {
      giveUserPermissions(i, allPermissions);
    }
    // Give admin user all permissions
    giveUserPermissions(16, allPermissions);

    var projectRoles = [
      {name: "Developer", description: "Developer"},
      {name: "Manager", description: "Manager"},
      {name: "Tester", description: "Tester"}
    ];
    for (var i in projects) {
      Array.prototype.push.apply(roles, projectRoles);
    }

    var projectMembers = [
      // Developers
      { user_id: 1, project_id: 1, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 2, project_id: 2, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 3, project_id: 2, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 3, project_id: 3, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 4, project_id: 3, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 4, project_id: 4, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 4, project_id: 5, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 5, project_id: 5, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 5, project_id: 6, join_date: randomDate(new Date(2012, 0, 1), new Date()) },

      // Managers
      { user_id: 6, project_id: 1, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 7, project_id: 2, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 8, project_id: 2, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 8, project_id: 3, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 9, project_id: 3, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 9, project_id: 4, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 9, project_id: 5, join_date:   randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 10, project_id: 5, join_date:  randomDate(new Date(2012, 0, 1), new Date())},
      { user_id: 10, project_id: 6, join_date:  randomDate(new Date(2012, 0, 1), new Date())},

      // Testers
      { user_id: 11, project_id: 1, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 12, project_id: 2, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 13, project_id: 2, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 13, project_id: 3, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 14, project_id: 3, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 14, project_id: 4, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 14, project_id: 5, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 15, project_id: 5, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
      { user_id: 15, project_id: 6, join_date: randomDate(new Date(2012, 0, 1), new Date()) },
    ];

    var projectMemberRoles = [
      // Developers
      {user_id: 1, project_id: 1, role_id: 2},
      {user_id: 2, project_id: 2, role_id: 2+3},
      {user_id: 3, project_id: 2, role_id: 2+3},
      {user_id: 3, project_id: 3, role_id: 2+6},
      {user_id: 4, project_id: 3, role_id: 2+6},
      {user_id: 4, project_id: 4, role_id: 2+9},
      {user_id: 4, project_id: 5, role_id: 2+12},
      {user_id: 5, project_id: 5, role_id: 2+12},
      {user_id: 5, project_id: 6, role_id: 2+15},

      // Managers
      {user_id: 6, project_id: 1, role_id:  3},
      {user_id: 7, project_id: 2, role_id:  3+3},
      {user_id: 8, project_id: 2, role_id:  3+3},
      {user_id: 8, project_id: 3, role_id:  3+6},
      {user_id: 9, project_id: 3, role_id:  3+6},
      {user_id: 9, project_id: 4, role_id:  3+9},
      {user_id: 9, project_id: 5, role_id:  3+12},
      {user_id: 10, project_id: 5, role_id: 3+12},
      {user_id: 10, project_id: 6, role_id: 3+15},

      // Testers
      {user_id: 11, project_id: 1, role_id: 4},
      {user_id: 12, project_id: 2, role_id: 4+3},
      {user_id: 13, project_id: 2, role_id: 4+3},
      {user_id: 13, project_id: 3, role_id: 4+6},
      {user_id: 14, project_id: 3, role_id: 4+6},
      {user_id: 14, project_id: 4, role_id: 4+9},
      {user_id: 14, project_id: 5, role_id: 4+12},
      {user_id: 15, project_id: 5, role_id: 4+12},
      {user_id: 15, project_id: 6, role_id: 4+15},
    ];

    var projectCreators = [
      { user_id: 6,     project_id: 1 },
      { user_id: 7,     project_id: 2 },
      { user_id: 8,     project_id: 3 },
      { user_id: 9,     project_id: 4 },
      { user_id: 10,    project_id: 5 },
      { user_id: 10,    project_id: 6 },
    ];

    var commonIssueTypes = [
      { name: "bug", description: "Bug" },
      { name: "feature_request", description: "Feature request" },
      { name: "proposal", description: "Proposal" },
      { name: "question", description: "Question" },
    ]
    var issueTypes = []
    for (var i in projects) {
      Array.prototype.push.apply(issueTypes, commonIssueTypes);
    }

    var testIssuesCnt = 10;
    var issues = []
    for (i = 1; i <= projects.length * testIssuesCnt; i++) {
      issues.push(
        {
          type_id: (i * commonIssueTypes.length / testIssuesCnt) % commonIssueTypes.length + 1,
          short_description: "Test issue (id: "+i+")",
          full_description: "Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of \"de Finibus Bonorum et Malorum\" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, \"Lorem ipsum dolor sit amet..\", comes from a line in section 1.10.32.",
          creation_date: randomDate(new Date(2012, 0, 1), new Date())
        }
      );
    }

    var issueAssignments = []
    for (i = 1; i <= projects.length * testIssuesCnt; i++) {
      issueAssignments.push(
        {
          issue_id: i,
          user_id: i % 5 + 1
        }
      );
    }

    var projectIssues = []
    for (i = 0; i < projects.length; i++) {
      for (var j = 0; j < testIssuesCnt; j++) {
        projectIssues.push({ project_id: i+1, issue_id: i * testIssuesCnt + j + 1, issue_index: j + 1 });
      }
    }

    // Create users
    query = query.then(data => knex.batchInsert(T.users.name, users));
    // Create projects
    query = query.then(data => knex.batchInsert(T.projects.name, projects));
    // Create roles
    query = query.then(data => knex.batchInsert(T.roles.name, roles));
    // Assign role permissions
    query = query.then(data => knex.batchInsert(T.role_permissions.name, rolePermissions));
    // Assign project members
    query = query.then(data => knex.batchInsert(T.project_members.name, projectMembers));
    // Assign project member roles
    query = query.then(data => knex.batchInsert(T.project_member_roles.name, projectMemberRoles));
    // Give users their global permissions
    query = query.then(data => knex.batchInsert(T.user_permissions.name, userPermissions));
    // Assign project creators
    query = query.then(data => knex.batchInsert(T.project_creators.name, projectCreators));
    // Create issue types
    query = query.then(data => knex.batchInsert(T.issue_types.name, issueTypes));
    // Create issues
    query = query.then(data => knex.batchInsert(T.issues.name, issues));
    // Assign issues to their assignees
    query = query.then(data => knex.batchInsert(T.issue_assignments.name, issueAssignments));
    // Assign issues to projects
    query = query.then(data => knex.batchInsert(T.project_issues.name, projectIssues));

    return query;
  }
}

module.exports = T;
