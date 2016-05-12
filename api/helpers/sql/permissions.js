'use strict';

module.exports = {
  create_issue: {
    description: ""
  },
  change_issue_status: {
    description: ""
  },
  close_issue: {
    description: ""
  },
  create_project: {
    description: ""
  },
  delete_project: {
    description: ""
  },

  asArray: () => {
    var arr = []
    for (var name in module.exports) {
      if (module.exports.hasOwnProperty(name) && !(module.exports[name] instanceof Function)) {
        let item = Object.assign({"name": name}, module.exports[name]);
        arr.push(item);
      }
    }
    console.log("Permissions: asArray: "+arr);
    return arr;
  }
}
