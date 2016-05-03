module.exports = {
  /**
   * Delete all null (or undefined) properties from an object.
   * Set 'recurse' to true if you also want to delete properties in nested objects.
   */
  delete_null_properties: function(obj, recurse) {
      for (var i in obj) {
          if (obj[i] === null) {
              delete obj[i];
          } else if (recurse && typeof obj[i] === 'object') {
              this.delete_null_properties(obj[i], recurse);
          }
      }
  },

  /**
   * Delete all null (or undefined) properties from an object.
   * Set 'recurse' to true if you also want to delete properties in nested objects.
   */
  without_nulls: function(obj, recurse) {
    this.delete_null_properties(obj, recurse);
    return obj;
  },

  /**
   * Delete all null (or undefined) properties from an object.
   * Set 'recurse' to true if you also want to delete properties in nested objects.
   */
  without_foreign_fields: function(context, obj) {
    for (var key in context.foreignFields) {
      if (context.foreignFields.hasOwnProperty(key)) {
          delete obj[context.foreignFields[key]];
      }
    }
    return obj;
  }
}
