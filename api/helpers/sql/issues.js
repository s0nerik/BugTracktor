var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.increments('id');

    table.integer('project_id')
         .references('id')
         .inTable(tables.TABLE_PROJECTS);

    table.integer('type_id')
         .references('id')
         .inTable(tables.TABLE_ISSUE_TYPES);

    table.string('name');
    table.string('short_description');
    table.string('full_description');

    table.timestamps();
  }
}
