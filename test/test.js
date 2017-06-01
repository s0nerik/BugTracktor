var should = require('should');
var request = require('supertest');
// var server = require('../app');

describe('controllers', function() {

  describe('users', function() {
	  
    describe('POST /register', function() {
      it('should require user', function() { true });
    });
	
    describe('GET /get_token', function() {
      it('should require email and password', function() { true });
    });
	
	describe('GET /me', function() {
      it('should return user info', function() { true });
    });
	
  });

  describe('permissions', function() {
	
	describe('GET /permissions', function() {
      it('should return global permissions when no projectId is given', function() { true });
	  it('should return permissions inside the project when projectId is given', function() { true });
    });
	
  });

  describe('projects', function() {
	
	describe('GET /projects', function() {
      it('should return projects user is involved in', function() { true });
    });

	describe('POST /projects', function() {
      it('should require project', function() { true });
	  it('should return created project', function() { true });
    });
	
  });
  
  describe('issues', function() {
	
	describe('GET /projects/{projectId}/issues', function() {
      it('should return a list of project issues', function() { true });
    });
	
	describe('POST /projects/{projectId}/issues', function() {
      it('should require issue', function() { true });
    });
	
	describe('GET /projects/{projectId}/issues/{issueIndex}', function() {
	  it('should require project access', function() { true });
      it('should return issue', function() { true });
    });
	
	describe('PATCH /projects/{projectId}/issues/{issueIndex}', function() {
	  it('should require project access', function() { true });
	  it('should require additional rights', function() { true });
      it('should return issue', function() { true });
    });
	
	describe('DELETE /projects/{projectId}/issues/{issueIndex}', function() {
	  it('should require project access', function() { true });
	  it('should require additional rights', function() { true });
    });
	
  });
  
  describe('members', function() {
	
	describe('GET /projects/{projectId}/members', function() {
      it('should return a list of project members', function() { true });
    });
	
	describe('POST /projects/{projectId}/members', function() {
	  it('should require a project member', function() { true });
	  it('should require additional rights', function() { true });
      it('should return a project member', function() { true });
    });
	
	describe('GET /projects/{projectId}/members/{memberId}', function() {
	  it('should require an access to the project', function() { true });
      it('should return a project member', function() { true });
    });
	
	describe('PATCH /projects/{projectId}/members/{memberId}', function() {
	  it('should not require every member field', function() { true });
	  it('should require additional rights', function() { true });
      it('should return a project member', function() { true });
    });
	
	describe('DELETE /projects/{projectId}/members/{memberId}', function() {
	  it('should require additional rights', function() { true });
    });
	
  });
  
  describe('issue_types', function() {
	
	describe('GET /projects/{projectId}/issueTypes', function() {
      it('should return a list of project issue types', function() { true });
    });
	
	describe('GET /projects/{projectId}/issueTypes/{issueTypeId}', function() {
      it('should require project access', function() { true });
      it('should return an issue type', function() { true });
    });
	
	describe('PATCH /projects/{projectId}/issueTypes/{issueTypeId}', function() {
	  it('should not require every issue type field', function() { true });
      it('should require project access', function() { true });
      it('should return an issue type', function() { true });
    });
	
  });
  
  describe('roles', function() {
	
	describe('GET /projects/{projectId}/roles', function() {
      it('should return a list of project roles', function() { true });
    });
	
	describe('POST /projects/{projectId}/roles', function() {
      it('should require role', function() { true });
	  it('should return role', function() { true });
    });
	
  });
  
});
