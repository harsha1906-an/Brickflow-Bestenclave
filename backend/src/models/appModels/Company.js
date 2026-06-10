const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    address: String,
    phone: String,
    email: String,
    isActive: {
        type: Boolean,
        default: true,
    },
    removed: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { skipTenant: true });

module.exports = mongoose.model('Company', CompanySchema);
