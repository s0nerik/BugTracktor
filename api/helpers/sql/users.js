var tables = require('./tables.js');
module.exports = {
  create: function (table) {
    table.increments('id');
    table.string('email');
    table.string('nickname');
    table.string('real_name');

    table.timestamps();
  }
}
