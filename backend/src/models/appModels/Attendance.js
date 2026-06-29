const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true
    },
    labourId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Labour',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day', 'overtime', 'casual-leave'],
        required: true
    },
    otHours: {
        type: Number,
        default: 0
    },
    advanceDeduction: {
        type: Number,
        default: 0
    },
    penalty: {
        type: Number,
        default: 0
    },
    wage: {
        type: Number,
        default: 0
    },
    miscWorkDescription: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

AttendanceSchema.index({ labourId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
