const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true,
    },
    number: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
        required: true,
    },
    recipientType: {
        type: String,
        enum: ['Supplier', 'Labour', 'Other'],
        default: 'Other',
        required: true,
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: function () {
            return this.recipientType === 'Supplier';
        },
        autopopulate: true,
    },
    supplierPayments: [
        {
            inventoryTransaction: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'InventoryTransaction',
                autopopulate: true,
            },
            amountPaid: {
                type: Number,
                required: true,
            },
        },
    ],
    labour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Labour',
        required: function () {
            return this.recipientType === 'Labour';
        },
        autopopulate: true,
    },
    villa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Villa',
        autopopulate: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card'],
        default: 'Cash',
    },
    penalty: {
        type: Number,
        default: 0,
    },
    // Added Tax Fields
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        autopopulate: true,
    },
    paymentType: {
        type: String,
        enum: ['Construction', 'Land', 'Other'],
        default: 'Construction',
    },
    tax: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Taxes',
        autopopulate: true,
    },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    taxType: { type: String, enum: ['IGST', 'CGST_SGST', 'None'], default: 'None' },
    discount: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    gstin: { type: String },
    advance: {
        type: Number,
        default: 0,
    },
    balance: {
        type: Number,
        default: 0,
    },
    betta: {
        type: Number,
        default: 0,
    },
    extra: {
        type: Number,
        default: 0,
    },
    reference: {
        type: String,
    },
    otherRecipient: {
        type: String,
    },
    transactionCode: {
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

schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Expense', schema);
