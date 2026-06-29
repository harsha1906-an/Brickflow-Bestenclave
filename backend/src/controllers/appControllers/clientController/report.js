const mongoose = require('mongoose');
const moment = require('moment');
const pdfController = require('@/controllers/pdfController');

const BookingModel = mongoose.model('Booking');

const report = async (Model, req, res) => {
    try {
        console.log('Generating Customer Report - Start');
        // 1. Fetch all non-removed clients
        const clients = await Model.find({ removed: false }).sort({ created: -1 });

        // 2. Fetch active bookings and map Villas, and sum booking totalAmount
        const bookings = await BookingModel.find({ removed: false, status: { $ne: 'cancelled' } })
            .populate('villa', 'villaNumber')
            .select('client villa totalAmount status');

        const bookingMap = {};
        const clientTotalValue = {};
        bookings.forEach(b => {
            if (b.client) {
                const clientId = b.client.toString();
                if (b.villa) {
                    bookingMap[clientId] = b.villa.villaNumber;
                }
                clientTotalValue[clientId] = (clientTotalValue[clientId] || 0) + (b.totalAmount || 0);
            }
        });

        // 3. Fetch all payments to sum total paid per client
        const PaymentModel = mongoose.model('Payment');
        const payments = await PaymentModel.find({ removed: false }).select('client amount');
        const clientTotalPaid = {};
        payments.forEach(p => {
            if (p.client) {
                const clientId = p.client.toString();
                clientTotalPaid[clientId] = (clientTotalPaid[clientId] || 0) + (p.amount || 0);
            }
        });

        // 4. Prepare data for PDF
        const clientsWithFinancials = clients.map(c => {
            const clientId = c._id.toString();
            const totalValue = clientTotalValue[clientId] || 0;
            const totalPaid = clientTotalPaid[clientId] || 0;
            return {
                ...c.toObject(),
                villaNumber: bookingMap[clientId] || null,
                totalValue,
                totalPaid,
                balance: totalValue - totalPaid
            };
        });

        const reportData = {
            clients: clientsWithFinancials,
            totals: {
                totalValue: clientsWithFinancials.reduce((sum, c) => sum + c.totalValue, 0),
                totalPaid: clientsWithFinancials.reduce((sum, c) => sum + c.totalPaid, 0),
                balance: clientsWithFinancials.reduce((sum, c) => sum + c.balance, 0)
            }
        };

        // 5. Generate PDF
        const pdfBuffer = await pdfController.generatePdf(
            'CustomerSummary',
            { filename: 'customer_summary', format: 'A4' },
            reportData
        );

        // 6. Send PDF
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="customer_summary.pdf"',
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Customer Report Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate report',
            error: error.message
        });
    }
};

module.exports = report;
