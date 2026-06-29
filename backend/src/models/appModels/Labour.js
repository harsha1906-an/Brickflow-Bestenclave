const mongoose = require('mongoose');

const LabourSchema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false,
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
    name: {
        type: String,
        required: true
    },
    skill: {
        type: String,
        enum: ['mason', 'electrician', 'plumber', 'helper', 'staff', 'other'],
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    employmentType: {
        type: String,
        enum: ['daily', 'monthly', 'contract'],
        default: 'daily'
    },
    isSubstitute: {
        type: Boolean,
        default: false
    },
    dailyWage: {
        type: Number,
        default: 0
    },
    monthlySalary: {
        type: Number,
        default: 0
    },
    paymentDay: {
        type: Number,
        default: 1
    },
    phone: {
        type: String,
        default: '',
        validate: {
            validator: function (v) {
                return !v || /^[0-9]{10}$/.test(v);
            },
            message: (props) => `${props.value} is not a valid 10-digit phone number!`,
        },
    },
    customSkill: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    milestonePlan: {
        type: [String],
        default: [
            'Basement Level',
            'Slab Completion',
            'Brick Work',
            'Plastering',
            'Finishing'
        ]
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Labour', LabourSchema);
