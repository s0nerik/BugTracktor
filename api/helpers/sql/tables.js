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
  delete_null_properties(obj, recurse);
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
 * Take only specified fields
 */
function take_fields(obj, fields) {
  var newObj = {}
  for (var key in obj) {
    if (fields.indexOf(key) >= 0) {
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

function remove_with_id(table, id) {
  var query;
  if (id) {
    query = knex.del().where("id", id).from(table.name);
  } else {
    query = knex.del().from(table.name);
  }
  return query.then(affectedRows => {message: "success"});
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
      insert_without(T.issues, issue, ["id", "project", "type", "history", "creation_date"])
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
                    .return(args[0])
      ),
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
    }
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
  permissions: {
    name: "Permissions",
    fields: ["id", "name", "description"],
    init: table => {
      table.increments("id");

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  users: {
    name: "Users",
    fields: ["id", "email", "nickname", "real_name"],
    init: table => {
      table.increments("id");
      table.string("email");
      table.string("nickname");
      table.string("real_name");

      table.timestamps();
    },
  },
  project_members: {
    name: "Project_Members",
    fields: ["user_id", "project_id", "join_date", "exit_date"],
    init: table => {
      table.integer("user_id")
           .references("id")
           .inTable(T.users.name);

      table.integer("project_id")
           .references("id")
           .inTable(T.projects.name);

      table.date("join_date");
      table.date("exit_date");

      table.primary(["user_id", "project_id"]);

      table.timestamps();
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

  /*
   * Global database functions
   */
  createAllTables: function(knex) {
    for (var key in T) {
      if (T.hasOwnProperty(key) && !(T[key] instanceof Function)) {
        knex.schema.createTableIfNotExists(T[key].name, T[key].init).return(0)
      }
    }
  },
  dropAllTables: function(knex) {
    for (var key in T) {
      if (T.hasOwnProperty(key) && !(T[key] instanceof Function)) {
        knex.schema.dropTableIfExists(T[key].name).return(0);
      }
    }
  }
}

module.exports = T;
