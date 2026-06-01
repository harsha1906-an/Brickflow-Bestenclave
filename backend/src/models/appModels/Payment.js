const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },

  createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin', required: true },
  number: {
    type: Number,
    required: true,
  },
  transactionCode: {
    type: String,
    default: () => 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
  },
  client: {
    type: mongoose.Schema.ObjectId,
    ref: 'Client',
    required: true,
  },
  villa: {
    type: mongoose.Schema.ObjectId,
    ref: 'Villa',
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
  },
  invoice: {
    type: mongoose.Schema.ObjectId,
    ref: 'Invoice',
    // required: true, // Made optional for Booking payments
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'NA',
    uppercase: true,
    required: true,
  },
  paymentMode: {
    type: String,
    enum: ['Loan', 'Card', 'Cash', 'Bank Transfer'],
    required: true,
  },
  // Added Tax Fields
  paymentType: {
    type: String,
    enum: ['Construction', 'Land', 'Other'],
    default: 'Construction',
  },
  tax: { type: mongoose.Schema.Types.ObjectId, ref: 'Taxes', autopopulate: true },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  taxType: { type: String, enum: ['IGST', 'CGST_SGST', 'None'], default: 'None' },
  totalAmount: { type: Number, default: 0 },
  ledger: {
    type: String,
    enum: ['official', 'internal'],
    default: 'official',
    required: true,
  },
  buildingStage: {
    type: String,
  },
  milestoneId: {
    type: mongoose.Schema.ObjectId,
  },
  ref: {
    type: String,
  },
  description: {
    type: String,
  },
  updated: {
    type: Date,
    default: Date.now,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});
// paymentSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Payment', paymentSchema);
