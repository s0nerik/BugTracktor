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
    if (fields.indexOf(key) < 0) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

GLOBAL.tables = {
  projects: {
    name: "Projects",
    fields: ["id", "name", "short_description", "full_description"],
    foreignFields: ["members", "issues"],
    init: function (table) {
      table.increments("id");
      table.string("name");
      table.string("short_description");
      table.string("full_description");
      table.timestamps();
    },
    new: function(project) {
      return knex.insert(without_fields(project, ["id", "members", "issues"]))
                .into(tables.projects.name)
                .then(function(ids) { return tables.projects.get(ids[0]) })
                .then(function(data) { return without_nulls(data, true) });
    },
    get: function(id) {
      var query;
      if (id) {
        query = knex.first().where("id", id).from(tables.projects.name);
      } else {
        query = knex.select().from(tables.projects.name);
      }
      return query.then(function (data) { return without_nulls(data, true) });
    }
  },
  issue_types: {
    name: "Issue_Types",
    fields: ["id", "name", "description"],
    init: function (table) {
      table.increments("id");
      table.string("name");
      table.string("description");
      table.timestamps();
    }
  },
  issues: {
    name: "Issues",
    fields: ["id", "project_id", "type_id", "short_description", "full_description", "creation_date"],
    foreignFields: ["project", "type", "history"],
    init: function (table) {
      table.increments("id");

      table.integer("project_id")
           .references("id")
           .inTable(tables.projects.name);

      table.integer("type_id")
           .references("id")
           .inTable(tables.issue_types.name);

      table.date("creation_date");
      table.string("short_description");
      table.string("full_description");

      table.timestamps();
    }
  },
  issue_changes: {
    name: "Issue_Changes",
    fields: ["issue_id", "date", "description", "change_type_id", "author_id", "creation_date"],
    foreignFields: ["project", "type", "history"],
    init: function (table) {
      table.integer("issue_id")
           .references("id")
           .inTable(tables.issues.name);

      table.date("date");
      table.string("description");

      table.integer("change_type_id")
           .references("id")
           .inTable(tables.issue_change_types.name);
      table.integer("author_id")
           .references("id")
           .inTable(tables.project_members.name);

      table.primary(["issue_id", "date"]);

      table.timestamps();
    }
  },
  issue_change_types: {
    name: "Issue_Change_Types",
    fields: ["id", "project_id", "name", "description"],
    init: function (table) {
      table.increments("id");
      table.integer("project_id")
           .references("id")
           .inTable(tables.projects.name);

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  roles: {
    name: "Roles",
    fields: ["id", "name", "description"],
    init: function (table) {
      table.increments("id");

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  permissions: {
    name: "Permissions",
    fields: ["id", "name", "description"],
    init: function (table) {
      table.increments("id");

      table.string("name");
      table.string("description");

      table.timestamps();
    },
  },
  users: {
    name: "Users",
    fields: ["id", "email", "nickname", "real_name"],
    init: function (table) {
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
    init: function (table) {
      table.integer("user_id")
           .references("id")
           .inTable(tables.users.name);

      table.integer("project_id")
           .references("id")
           .inTable(tables.projects.name);

      table.date("join_date");
      table.date("exit_date");

      table.primary(["user_id", "project_id"]);

      table.timestamps();
    },
  },
  project_member_roles: {
    name: "Project_Member_Roles",
    fields: ["user_id", "project_id", "role_id"],
    init: function (table) {
      table.integer("user_id")
           .references("id")
           .inTable(tables.users.name);

      table.integer("project_id")
           .references("id")
           .inTable(tables.projects.name);

      table.integer("role_id")
           .references("id")
           .inTable(tables.roles.name);

      table.primary(["user_id", "project_id", "role_id"]);

      table.timestamps();
    },
  },
}

module.exports = {
  createAllTables: function(knex) {
    for (var key in tables) {
      if (tables.hasOwnProperty(key)) {
        knex.schema.createTableIfNotExists(tables[key].name, tables[key].init).return(0)
      }
    }
  },
  dropAllTables: function(knex) {
    for (var key in tables) {
      if (tables.hasOwnProperty(key)) {
        knex.schema.dropTableIfExists(tables[key].name).return(0);
      }
    }
  }
}
