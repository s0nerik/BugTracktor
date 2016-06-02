'use strict';

var check = require('check-types');
var _ = require('lodash');

module.exports = {
  keyValueDiffs: (obj1, obj2) => {
    var sameKeys = []
    for (let key in obj1) {
      if (key in obj2) {
        sameKeys.push(key);
      }
    }
    var diffKeyValues = {}
    for (let key in sameKeys) {
      if (check.array(obj1[sameKeys[key]]) && check.array(obj2[sameKeys[key]])) {
        if (_.isEqual(obj1[sameKeys[key]], obj2[sameKeys[key]])) {
          diffKeyValues[sameKeys[key]] = {old: obj1[sameKeys[key]], new: obj2[sameKeys[key]]}
        }
      } else if (obj1[sameKeys[key]] != obj2[sameKeys[key]]) {
        diffKeyValues[sameKeys[key]] = {old: obj1[sameKeys[key]], new: obj2[sameKeys[key]]}
      }
    }
    return diffKeyValues;
  },
  produceIssueChangeInfo: diff => {
    var fields = []
    var oldValues = []
    var newValues = []
    for (var key in diff) {
      fields.push(key);
      oldValues.push(diff[key].old);
      newValues.push(diff[key].new);
    }
    return {fields: fields, old_values: oldValues, new_values: newValues};
  },
}
