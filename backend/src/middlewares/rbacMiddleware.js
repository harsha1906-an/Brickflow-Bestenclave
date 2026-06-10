const rbacConfig = require('@/settings/rbacConfig');

const checkRbac = (entity, action) => {
  return (req, res, next) => {
    // req.admin is set by isValidAuthToken middleware
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No authentication details found.',
      });
    }

    const role = req.admin.role || 'engineer'; // Fallback to lowest privilege
    
    // Default fallback rules if entity or action is not defined in rbacConfig
    let allowedRoles = ['owner', 'manager']; // Default: restrictive for writes/actions
    if (['read', 'list', 'listAll', 'search', 'filter', 'summary'].includes(action)) {
      allowedRoles = ['owner', 'manager', 'engineer', 'accountant']; // Default: permissive for reads
    }

    // Override from configuration if present
    if (rbacConfig.entities[entity] && rbacConfig.entities[entity][action]) {
      allowedRoles = rbacConfig.entities[entity][action];
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role (${role}) is not authorized to perform ${action} on ${entity}.`,
      });
    }

    next();
  };
};

module.exports = checkRbac;
