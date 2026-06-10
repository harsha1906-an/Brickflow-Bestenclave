const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    validate: {
      validator: function (v) {
        // Allow 10-digit numbers OR numbers with country code (e.g., +91, 0091)
        // Regex: Optional + or 00, followed by digits, totaling 10-15 digits
        return !v || /^(\+|00)?[0-9\-\s]{10,15}$/.test(v.replace(/[\-\s]/g, ''));
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },
  country: String,
  address: String,
  email: String,
  customerId: String,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  fatherName: String,
  dob: Date,
  aadharCardNumber: String,
  panCardNumber: String,
  drivingLicence: String,
  // Nominee Details
  nomineeName: String,
  nomineeFatherHusbandName: String,
  nomineeRelationship: String,
  nomineeDob: Date,
  nomineeMobile: String,
  nomineeAddress: String,

  // GST Details
  state: String,
  gstin: String,
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    index: true,
  },
  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  assigned: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
  created: {
    type: Date,
    default: Date.now,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
});

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Client', schema);
