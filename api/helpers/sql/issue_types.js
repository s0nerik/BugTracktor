var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.increments('id');
    table.string('name');
    table.string('description');
    table.timestamps();
  }
}
