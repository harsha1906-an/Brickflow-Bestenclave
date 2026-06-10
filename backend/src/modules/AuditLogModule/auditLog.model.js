const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Admin',
    required: true,
    index: true,
    autopopulate: true,
  },
  module: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  entityType: {
    type: String,
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

auditLogSchema.set('versionKey', false);
auditLogSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('AuditLog', auditLogSchema);