const create = async (Model, req, res) => {
  // Creating a new document in the collection
  console.log('Create Request Body:', req.body);
  
  // Prevent Mass Assignment of critical system fields
  const blacklistedFields = ['removed', 'enabled', 'role', 'password', 'salt', 'loggedSessions'];
  blacklistedFields.forEach(field => delete req.body[field]);

  req.body.removed = false;
  const result = await new Model({
    ...req.body,
  }).save();

  const { logAuditAction } = require('../../../modules/AuditLogModule/auditLog.middleware');
  logAuditAction({
    req,
    module: Model.modelName,
    action: 'create',
    entityType: Model.modelName,
    entityId: result._id,
    metadata: {
      new: result.toObject(),
    },
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Created the document in Model ',
  });
};

module.exports = create;
