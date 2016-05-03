var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.increments('id');
    table.integer('project_id')
         .references('id')
         .inTable(tables.TABLE_PROJECTS);

    table.string('name');
    table.string('description');

    table.timestamps();
  }
}
