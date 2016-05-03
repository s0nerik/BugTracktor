var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.integer('user_id')
         .references('id')
         .inTable(tables.TABLE_USERS);

    table.integer('project_id')
         .references('id')
         .inTable(tables.TABLE_PROJECTS);

    table.date('join_date');
    table.date('exit_date');

    table.primary('user_id', 'project_id');

    table.timestamps();
  }
}
