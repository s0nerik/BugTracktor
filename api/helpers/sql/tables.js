var projects = require('./projects');
var issues = require('./issues');
var issueTypes = require('./issue_types');
var issueChanges = require('./issue_changes');
var issueChangeTypes = require('./issue_change_types');
var roles = require('./roles');
var permissions = require('./permissions');
var users = require('./users');
var projectMembers = require('./project_members');
var projectMemberRoles = require('./project_member_roles');

GLOBAL.tables = {
  TABLE_PROJECTS: "Projects",
  TABLE_ISSUES: "Issues",
  TABLE_ISSUE_TYPES: "Issue_Types",
  TABLE_ISSUE_CHANGES: "Issue_Changes",
  TABLE_ISSUE_CHANGE_TYPES: "Issue_Change_Types",
  TABLE_ROLES: "Roles",
  TABLE_PERMISSIONS: "Permissions",
  TABLE_USERS: "Users",
  TABLE_PROJECT_MEMBERS: "Project_Members",
  TABLE_PROJECT_MEMBER_ROLES: "Project_Member_Roles",
}

module.exports = {
  createProjectsTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_PROJECTS, projects.create);
  },
  createIssuesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_ISSUES, issues.create);
  },
  createIssueTypesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_ISSUE_TYPES, issueTypes.create);
  },
  createIssueChangesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_ISSUE_CHANGES, issueChanges.create);
  },
  createIssueChangeTypesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_ISSUE_CHANGE_TYPES, issueChangeTypes.create);
  },
  createRolesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_ROLES, roles.create);
  },
  createPermissionsTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_PERMISSIONS, permissions.create);
  },
  createUsersTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_USERS, users.create);
  },
  createProjectMembersTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_PROJECT_MEMBERS, projectMembers.create);
  },
  createProjectMemberRolesTable: function(knex) {
    return knex.schema.createTableIfNotExists(tables.TABLE_PROJECT_MEMBER_ROLES, projectMemberRoles.create);
  },
  createAllTables: function(knex) {
    this.createProjectsTable(knex).return(0);
    this.createIssueTypesTable(knex).return(0);
    this.createIssuesTable(knex).return(0);
    this.createIssueChangesTable(knex).return(0);
    this.createIssueChangeTypesTable(knex).return(0);
    this.createPermissionsTable(knex).return(0);
    this.createUsersTable(knex).return(0);
    this.createProjectMembersTable(knex).return(0);
    this.createProjectMemberRolesTable(knex).return(0);
  },
  dropAllTables: function(knex) {
    for (var key in exports) {
      if (key.startsWith("TABLE_")) {
        knex.schema.dropTableIfExists(exports[key]).return(0);
      }
    }
  }
}
