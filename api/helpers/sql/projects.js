var utils = require('../utils');

GLOBAL.projects = {
  fields: {
    id: "id",
    name: "name",
    short_description: "short_description",
    full_description: "full_description",
  },
  foreignFields: {
    members: "members",
    issues: "issues",
  }
}

module.exports = {
  create: function (table) {
    table.increments('id');
    table.string('name');
    table.string('short_description');
    table.string('full_description');
    table.timestamps();
  },
  new: function(project) {
    return knex.insert(utils.without_foreign_fields(projects, project)).into(tables.TABLE_PROJECTS);
  },
  get: function(id) {
    return knex.select().where(projects.fields.id, id).from(tables.TABLE_PROJECTS);
  }
}
