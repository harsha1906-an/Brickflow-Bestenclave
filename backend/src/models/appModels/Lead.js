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
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^[0-9]{10}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid 10-digit phone number!`,
        },
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
    source: {
        type: String, // Walk-in, Referral, Website, Ads, Broker, Other
        default: 'Other',
    },
    interestedVillaType: {
        type: String, // 3BHK, 4BHK, Plot, etc.
    },
    status: {
        type: String,
        enum: ['New', 'Contacted', 'Site Visit', 'Negotiation', 'Converted', 'Lost'],
        default: 'New',
    },
    lostReason: {
        type: String,
        enum: ['Budget', 'Location', 'Competitor', 'Timeline', 'Not Interested', 'Other', null],
    },
    assignedTo: {
        type: mongoose.Schema.ObjectId,
        ref: 'Admin', // Assuming users are Admins
    },
    notes: {
        type: String,
    },
    companyId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Company',
        index: true,
    },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'Admin' },
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

module.exports = mongoose.model('Lead', schema);
