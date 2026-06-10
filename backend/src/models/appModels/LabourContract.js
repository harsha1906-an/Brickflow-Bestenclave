const mongoose = require('mongoose');

const LabourContractSchema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true,
    },
    labour: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Labour',
        required: true,
        autopopulate: true,
    },
    villa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Villa',
        required: true,
        autopopulate: true,
    },
    ratePerSqft: {
        type: Number,
        required: true,
    },
    groundFloorArea: {
        type: Number,
        default: 0,
    },
    firstFloorArea: {
        type: Number,
        default: 0,
    },
    totalSqft: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    milestones: [
        {
            name: { type: String, required: true },
            percentage: { type: Number, required: true },
            amount: { type: Number, required: true },
            advanceDeduction: { type: Number, default: 0 },
            penalty: { type: Number, default: 0 },
            netAmount: { type: Number, default: 0 },
            isCompleted: { type: Boolean, default: false },
            completionDate: { type: Date },
            paymentMode: { type: String },
            reference: { type: String },
            expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
        },
    ],
    created: {
        type: Date,
        default: Date.now,
    },
});

LabourContractSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('LabourContract', LabourContractSchema);
