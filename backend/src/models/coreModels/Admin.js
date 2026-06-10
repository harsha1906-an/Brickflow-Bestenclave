const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  phone: {
    type: String,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    default: 'owner',
    enum: ['owner', 'manager', 'engineer', 'accountant'],
  },
  dashboardConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { skipTenant: true });

module.exports = mongoose.model('Admin', adminSchema);
