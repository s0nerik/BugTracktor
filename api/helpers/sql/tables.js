GLOBAL.tables = {
  projects: {
    name: "Projects",
    fields: {
      id: "id",
      name: "name",
      short_description: "short_description",
      full_description: "full_description",
    },
    foreignFields: {
      members: "members",
      issues: "issues",
    },
    init: function (table) {
      var fields = tables.projects.fields;

      table.increments(fields.id);
      table.string(fields.name);
      table.string(fields.short_description);
      table.string(fields.full_description);
      table.timestamps();
    },
    new: function(project) {
      return knex.insert(utils.without_foreign_fields(this.projects, project)).into(this.projects.name);
    },
    get: function(id) {
      if (id) {
        return knex.select().where(this.projects.fields.id, id).from(this.projects.name)[0];
      } else {
        return knex.select().from(this.projects.name);
      }
    }
  },
  issue_types: {
    name: "Issue_Types",
    fields: {
      id: "id",
      name: "name",
      description: "description",
    },
    init: function (table) {
      var fields = tables.issue_types.fields;

      table.increments(fields.id);
      table.string(fields.name);
      table.string(fields.description);
      table.timestamps();
    }
  },
  issues: {
    name: "Issues",
    fields: {
      id: "id",
      project_id: "project_id",
      type_id: "type_id",
      short_description: "short_description",
      full_description: "full_description",
      creation_date: "creation_date"
    },
    foreignFields: {
      project: "project",
      type: "type",
      history: "history"
    },
    init: function (table) {
      var fields = tables.issues.fields;

      table.increments(fields.id);

      table.integer(fields.project_id)
           .references(tables.projects.fields.id)
           .inTable(tables.projects.name);

      table.integer(fields.type_id)
           .references(tables.issue_types.fields.id)
           .inTable(tables.issue_types.name);

      table.date(fields.creation_date);
      table.string(fields.short_description);
      table.string(fields.full_description);

      table.timestamps();
    }
  },
  issue_changes: {
    name: "Issue_Changes",
    fields: {
      issue_id: "issue_id",
      date: "date",
      description: "description",
      change_type_id: "change_type_id",
      author_id: "author_id",
      creation_date: "creation_date"
    },
    foreignFields: {
      project: "project",
      type: "type",
      history: "history"
    },
    init: function (table) {
      var fields = tables.issue_changes.fields;

      table.integer(fields.issue_id)
           .references(tables.issues.fields.id)
           .inTable(tables.issues.name);

      table.date(issues.date);
      table.string(issues.description);

      table.integer(issues.change_type_id)
           .references(tables.issue_change_types.fields.id)
           .inTable(tables.issue_change_types.name);
      table.integer(issues.author_id)
           .references(tables.project_members.fields.id)
           .inTable(tables.project_members.name);

      table.primary([fields.issue_id, issues.date]);

      table.timestamps();
    }
  },
  issue_change_types: {
    name: "Issue_Change_Types",
    fields: {
      id: "id",
      project_id: "project_id",
      name: "name",
      description: "description",
    },
    init: function (table) {
      var fields = tables.issue_change_types.fields;

      table.increments(fields.id);
      table.integer(fields.project_id)
           .references(tables.projects.fields.id)
           .inTable(tables.projects.name);

      table.string(fields.name);
      table.string(fields.description);

      table.timestamps();
    },
  },
  roles: {
    name: "Roles",
    fields: {
      id: "id",
      name: "name",
      description: "description",
    },
    init: function (table) {
      var fields = tables.roles.fields;

      table.increments(fields.id);

      table.string(fields.name);
      table.string(fields.description);

      table.timestamps();
    },
  },
  permissions: {
    name: "Permissions",
    fields: {
      id: "id",
      name: "name",
      description: "description",
    },
    init: function (table) {
      var fields = tables.permissions.fields;

      table.increments(fields.id);

      table.string(fields.name);
      table.string(fields.description);

      table.timestamps();
    },
  },
  users: {
    name: "Users",
    fields: {
      id: "id",
      email: "email",
      nickname: "nickname",
      real_name: "real_name",
    },
    init: function (table) {
      var fields = tables.users.fields;

      table.increments(fields.id);
      table.string(fields.email);
      table.string(fields.nickname);
      table.string(fields.real_name);

      table.timestamps();
    },
  },
  project_members: {
    name: "Project_Members",
    fields: {
      user_id: "user_id",
      project_id: "project_id",
      join_date: "join_date",
      exit_date: "exit_date",
    },
    init: function (table) {
      var fields = tables.project_members.fields;

      table.integer(fields.user_id)
           .references(tables.users.fields.id)
           .inTable(tables.users.name);

      table.integer(fields.project_id)
           .references(tables.projects.fields.id)
           .inTable(tables.projects.name);

      table.date(fields.join_date);
      table.date(fields.exit_date);

      table.primary(fields.user_id, fields.project_id);

      table.timestamps();
    },
  },
  project_member_roles: {
    name: "Project_Member_Roles",
    fields: {
      user_id: "user_id",
      project_id: "project_id",
      role_id: "role_id",
    },
    init: function (table) {
      var fields = tables.project_member_roles.fields;

      table.integer(fields.user_id)
           .references(tables.users.fields.id)
           .inTable(tables.users.name);

      table.integer(fields.project_id)
           .references(tables.projects.fields.id)
           .inTable(tables.projects.name);

      table.integer(fields.role_id)
           .references(tables.roles.fields.id)
           .inTable(tables.roles.name);

      table.primary(fields.user_id, fields.project_id, fields.role_id);

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
