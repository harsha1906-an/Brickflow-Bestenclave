const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const tenantMiddleware = (req, res, next) => {
  // Retrieve companyId from req.admin (set by JWT middleware) or headers/query
  const companyId = 
    (req.admin && req.admin.companyId) || 
    req.headers['x-tenant-id'] || 
    req.query.tenantId;

  if (companyId) {
    // Run next middlewares/routes within the AsyncLocalStorage context
    tenantStorage.run(companyId.toString(), () => {
      next();
    });
  } else {
    next();
  }
};

module.exports = {
  tenantStorage,
  tenantMiddleware,
};
