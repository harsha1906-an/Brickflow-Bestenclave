const { tenantStorage } = require('./tenantContext');

module.exports = function tenantPlugin(schema) {
  // Skip if explicitly marked or if it is a core system schema
  const skippedCollections = ['admins', 'adminpasswords', 'settings', 'uploads', 'companies'];
  const collectionName = schema.options.collection;
  
  if (
    schema.options.skipTenant || 
    (collectionName && skippedCollections.includes(collectionName.toLowerCase())) ||
    !schema.paths.companyId
  ) {
    return;
  }

  // Helper to append companyId to query filter
  const addTenantCondition = function (next) {
    const tenantId = tenantStorage.getStore() || '6a1d884573247f2dc036cb18';
    
    if (tenantId) {
      const filter = this.getFilter();
      
      // If companyId is not explicitly specified in the query, inject it
      if (filter.companyId === undefined) {
        this.where({ companyId: tenantId });
      }
    }
    next();
  };

  // Register hook for queries
  schema.pre('find', addTenantCondition);
  schema.pre('findOne', addTenantCondition);
  schema.pre('count', addTenantCondition);
  schema.pre('countDocuments', addTenantCondition);
  
  // Register hook for updates/deletions
  schema.pre('update', addTenantCondition);
  schema.pre('updateOne', addTenantCondition);
  schema.pre('updateMany', addTenantCondition);
  schema.pre('findOneAndUpdate', addTenantCondition);
  schema.pre('findOneAndRemove', addTenantCondition);
  schema.pre('findOneAndDelete', addTenantCondition);
  schema.pre('deleteOne', addTenantCondition);
  schema.pre('deleteMany', addTenantCondition);
  schema.pre('remove', addTenantCondition);

  // Hook for saving new documents
  schema.pre('save', function (next) {
    const tenantId = tenantStorage.getStore() || '6a1d884573247f2dc036cb18';
    // Auto-populate companyId on new document creation if not specified
    if (tenantId && (this.companyId === undefined || this.companyId === null)) {
      this.companyId = tenantId;
    }
    next();
  });
};
