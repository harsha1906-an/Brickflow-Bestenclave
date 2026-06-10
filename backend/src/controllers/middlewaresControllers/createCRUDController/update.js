const update = async (Model, req, res) => {
  // Find document by id and updates with the required fields
  
  // Prevent Mass Assignment of critical system fields
  const blacklistedFields = ['removed', 'enabled', 'role', 'password', 'salt', 'loggedSessions'];
  blacklistedFields.forEach(field => delete req.body[field]);

  req.body.removed = false;
  const oldDocument = await Model.findOne({
    _id: req.params.id,
    removed: false,
  }).lean().exec();

  const result = await Model.findOneAndUpdate(
    {
      _id: req.params.id,
      removed: false,
    },
    req.body,
    {
      new: true, // return the new result instead of the old one
      runValidators: true,
    }
  ).exec();
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    const { logAuditAction } = require('../../../modules/AuditLogModule/auditLog.middleware');
    logAuditAction({
      req,
      module: Model.modelName,
      action: 'update',
      entityType: Model.modelName,
      entityId: result._id,
      metadata: {
        old: oldDocument,
        new: result.toObject(),
      },
    });

    return res.status(200).json({
      success: true,
      result,
      message: 'we update this document ',
    });
  }
};

module.exports = update;
