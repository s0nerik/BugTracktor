'use strict';

module.exports = {
  list_projects: {
    request_method: "GET",
    request_url: ""
  },
  create_project: {
    request_method: "POST",
    request_url: ""
  },
  get_project: {
    request_method: "GET",
    request_url: ""
  },
  update_project: {
    request_method: "PUT",
    request_url: ""
  },
  list_issues: {
    request_method: "GET",
    request_url: ""
  },
  get_issue: {
    request_method: "GET",
    request_url: ""
  },
  create_issue: {
    request_method: "POST",
    request_url: ""
  },
  update_issue: {
    request_method: "PATCH",
    request_url: ""
  },
  change_issue_status: {
    request_method: "PUT",
    request_url: ""
  },
  close_issue: {
    request_method: "POST",
    request_url: ""
  },
  create_project: {
    request_method: "POST",
    request_url: ""
  },
  delete_project: {
    request_method: "DELETE",
    request_url: ""
  },
  assign_role: {
    request_method: "PUT",
    request_url: ""
  },
  deny_role: {
    request_method: "PUT",
    request_url: ""
  },

  asArray: () => {
    var arr = []
    for (var name in module.exports) {
      if (module.exports.hasOwnProperty(name) && !(module.exports[name] instanceof Function)) {
        let item = Object.assign({"name": name}, module.exports[name]);
        arr.push(item);
      }
    }
    return arr;
  }
}
