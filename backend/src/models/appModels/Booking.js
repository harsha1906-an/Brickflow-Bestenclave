const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    companyId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Company',
        required: false,
    },
    villa: {
        type: mongoose.Schema.ObjectId,
        ref: 'Villa',
        required: true,
        autopopulate: true,
    },
    client: {
        type: mongoose.Schema.ObjectId,
        ref: 'Client',
        required: true,
        autopopulate: true,
    },
    bookingDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    officialAmount: {
        type: Number,
        default: 0,
    },
    internalAmount: {
        type: Number,
        default: 0,
    },
    // Client snapshot fields
    phone: String,
    email: String,
    address: String,
    gender: String,
    fatherName: String,
    dob: Date,
    aadharCardNumber: String,
    panCardNumber: String,
    drivingLicence: String,
    customerId: String,

    // Villa snapshot fields
    villaNumber: String,
    houseType: String,
    facing: String,
    landArea: Number,
    groundFloorArea: Number,
    firstFloorArea: Number,
    builtUpArea: Number,
    accountableAmount: Number,
    nonAccountableAmount: Number,
    totalAmount: Number,
    officialAmount: Number,
    internalAmount: Number,

    // Payment Mode details
    paymentMode: {
        type: String,
        enum: ['full', 'installment'],
        default: 'full',
    },
    downPayment: {
        type: Number,
        default: 0,
    },
    emiAmount: {
        type: Number,
        default: 0,
    },
    noOfEmi: {
        type: Number,
        default: 0,
    },
    paymentMethod: {
        type: String,
        default: 'Cash',
    },
    transactionId: {
        type: String,
    },

    // Nominee Info
    nomineeName: String,
    nomineeFatherHusbandName: String,
    nomineeAddress: String,
    nomineeMobile: String,
    nomineeRelationship: String,
    nomineeDob: Date,
    agent: String,

    status: {
        type: String,
        enum: ['booked', 'cancelled', 'completed'],
        default: 'booked',
    },
    paymentPlan: [{
        no: Number,
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        accountableAmount: { type: Number, default: 0 },
        nonAccountableAmount: { type: Number, default: 0 },
        dueDate: Date,
        status: {
            type: String,
            enum: ['pending', 'paid', 'overdue', 'partially'],
            default: 'pending'
        },
        paidAmount: { type: Number, default: 0 },
        paidAccountableAmount: { type: Number, default: 0 },
        paidNonAccountableAmount: { type: Number, default: 0 },
        paymentDate: Date,
        notes: String,
        transactionId: String,
        paymentMode: String
    }],
    notes: String,
    updated: {
        type: Date,
        default: Date.now,
    },
    created: {
        type: Date,
        default: Date.now,
    },
});

bookingSchema.plugin(require('mongoose-autopopulate'));
module.exports = mongoose.model('Booking', bookingSchema);
