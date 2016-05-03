var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.integer('user_id')
         .references('id')
         .inTable(tables.TABLE_USERS);

    table.integer('project_id')
         .references('id')
         .inTable(tables.TABLE_PROJECTS);

    table.integer('role_id')
         .references('id')
         .inTable(tables.TABLE_ROLES);

    table.primary('user_id', 'project_id', 'role_id');

    table.timestamps();
  }
}
