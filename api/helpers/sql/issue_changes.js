var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.integer('issue_id')
         .references('id')
         .inTable(tables.TABLE_ISSUES);

    table.date('date');
    table.string('description');
    
    table.integer('change_type_id')
         .references('id')
         .inTable(tables.TABLE_ISSUE_CHANGE_TYPES);
    table.integer('author_id')
         .references('id')
         .inTable(tables.TABLE_PROJECT_MEMBERS);

    table.primary(['issue_id', 'date']);

    table.timestamps();
  }
}
