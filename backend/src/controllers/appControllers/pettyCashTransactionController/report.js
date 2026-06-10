const mongoose = require('mongoose');
const PettyCashTransaction = mongoose.model('PettyCashTransaction');
const moment = require('moment');
const { generatePdf } = require('@/controllers/pdfController');

const report = async (req, res) => {
    try {
        const { date, startDate, endDate, reportCategory } = req.query;

        // Helper function to generate data for a single day
        const generateSingleDayReport = async (reportDate) => {
            const targetDate = moment(reportDate, 'YYYY-MM-DD').startOf('day');
            const endOfDay = moment(reportDate, 'YYYY-MM-DD').endOf('day');

            // 1. Calculate Summary Totals (All transactions up to endOfDay)
            const allTransactionsQuery = await PettyCashTransaction.aggregate([
                {
                    $match: {
                        removed: false,
                        date: { $lte: endOfDay.toDate() }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            let totalCashReceived = 0;
            let totalExpenses = 0;
            allTransactionsQuery.forEach(item => {
                if (item._id === 'inward') totalCashReceived = item.total;
                if (item._id === 'outward') totalExpenses = item.total;
            });
            const currentBalance = totalCashReceived - totalExpenses;

            // 2. Get transactions (showing history up to this date)
            // Ideally a "Daily Report" should show transactions FOR THAT DAY, 
            // but the previous logic showed "history up to this date".
            // However, typically a daily report shows only that day's transactions 
            // with an opening balance. 
            // The previous code: date: { $lte: endDate.toDate() } which implies ledger style up to that date.
            // If we want "Daily Report" for a range, usually we want transactions for that specific day.
            // Let's stick to the previous logic IF it was intended, BUT "Daily Summary" usually means THAT day.
            // Let's assume for the Range Report, we want transactions for EACH specific day on its page.

            // Checking previous implementation of Daily Site Summary (reporting.service.js):
            // It fetched data for the specific day (startOfDay to endOfDay).
            // The previous code here fetched EVERYTHING up to that date. 
            // If we print 30 pages for a month, page 30 will have 30 days of transactions? That's huge.
            // "Petty Cash Book" usually means a ledger. 
            // If I change to "This Day Only", it might break expectation if they wanted full history.
            // BUT "Each day on separate page" strongly implies "Transactions for that day".
            // Let's filter for the specific day for the *Items* list, but keep *Balance* correct.

            // Calculating Opening Balance (Transactions BEFORE start of this day)
            const openingBalanceQuery = await PettyCashTransaction.aggregate([
                {
                    $match: {
                        removed: false,
                        date: { $lt: targetDate.toDate() }
                    }
                },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            let opIn = 0, opOut = 0;
            openingBalanceQuery.forEach(i => {
                if (i._id === 'inward') opIn = i.total;
                if (i._id === 'outward') opOut = i.total;
            });
            let openingBalance = opIn - opOut;

            // Transactions for THIS day only
            const dayTransactions = await PettyCashTransaction.find({
                removed: false,
                date: {
                    $gte: targetDate.toDate(),
                    $lte: endOfDay.toDate()
                }
            }).sort({ date: 1, created: 1 });

            let balanceAcc = openingBalance;
            let items = dayTransactions.map(item => {
                if (item.type === 'inward') balanceAcc += item.amount;
                if (item.type === 'outward') balanceAcc -= item.amount;
                return {
                    ...item.toObject(),
                    runningBalance: balanceAcc
                };
            });

            if (reportCategory === 'inward') {
                items = items.filter(i => i.type === 'inward');
            } else if (reportCategory === 'outward') {
                items = items.filter(i => i.type === 'outward');
            }

            return {
                date: targetDate.toDate(),
                totalCashReceived, // This is cumulative total up to end of day
                totalExpenses,     // This is cumulative total up to end of day
                currentBalance,    // Closing balance
                openingBalance,    // Added for clarity if needed
                items,
                manager: 'Manoja Kumar'
            };
        };

        let results = [];
        let filenameDate = '';

        if (startDate && endDate) {
            const start = moment(startDate, 'YYYY-MM-DD');
            const end = moment(endDate, 'YYYY-MM-DD');
            filenameDate = `${startDate}_to_${endDate}`;

            for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'days')) {
                const dayReport = await generateSingleDayReport(m.format('YYYY-MM-DD'));
                results.push(dayReport);
            }
        } else if (date) {
            filenameDate = date;
            const dayReport = await generateSingleDayReport(date);
            results.push(dayReport);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Date or Date Range is required'
            });
        }

        // 4. Generate PDF
        const pdfBuffer = await generatePdf(
            'pettycashreport',
            { filename: `PettyCashReport_${filenameDate}`, format: 'A4', landscape: false },
            results // Pass array
        );

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=PettyCashReport_${filenameDate}.pdf`,
            'Content-Length': pdfBuffer.length,
        });
        return res.send(Buffer.from(pdfBuffer));

    } catch (err) {
        console.error('Petty Cash Report Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error generating report',
            error: err.message
        });
    }
};

module.exports = report;
