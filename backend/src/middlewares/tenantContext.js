const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const tenantMiddleware = (req, res, next) => {
  // Retrieve companyId from headers, req.admin, or query parameters with a fallback
  const companyId = 
    req.headers['x-tenant-id'] || 
    (req.admin && req.admin.companyId) || 
    req.query.tenantId ||
    '6a1d884573247f2dc036cb18';
  
  if (req.admin) {
    req.admin.companyId = companyId;
  }

  // Run next middlewares/routes within the AsyncLocalStorage context
  tenantStorage.run(companyId.toString(), () => {
    next();
  });
};

module.exports = {
  tenantStorage,
  tenantMiddleware,
};
