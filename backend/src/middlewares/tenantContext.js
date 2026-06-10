const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const tenantMiddleware = (req, res, next) => {
  const companyId = '6a1d884573247f2dc036cb18';
  
  if (req.admin) {
    req.admin.companyId = companyId;
  }

  // Run next middlewares/routes within the AsyncLocalStorage context
  tenantStorage.run(companyId, () => {
    next();
  });
};

module.exports = {
  tenantStorage,
  tenantMiddleware,
};
