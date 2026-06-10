// Usage: Call logAuditAction({ ... }) after successful actions in controllers or service hooks.
const { appendAuditLog } = require('./auditLog.service');

/**
 * Helper to log audit actions. Call after main operation succeeds.
 * @param {Object} params
 * @param {Object} params.req - Express request object
 * @param {string} params.module - Module name (e.g., 'villa', 'payment')
 * @param {string} params.action - Action performed (e.g., 'create', 'update', 'attempt')
 * @param {string} params.entityType - Entity type (e.g., 'Villa', 'Payment')
 * @param {string|ObjectId} params.entityId - Entity id
 * @param {Object} [params.metadata] - Minimal metadata (optional)
 */
function logAuditAction({ req, module, action, entityType, entityId, metadata }) {
  const companyId = req.company?._id || req.companyId || req.body?.companyId || req.params?.companyId || req.admin?.companyId;
  const userId = req.user?._id || req.userId || req.adminId || req.admin?._id;
  if (!companyId || !userId) return;
  appendAuditLog({
    companyId,
    userId,
    module,
    action,
    entityType,
    entityId,
    metadata,
  });
}

module.exports = { logAuditAction };