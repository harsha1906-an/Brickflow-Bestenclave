const mongoose = require('mongoose');
const moment = require('moment');
const cron = require('node-cron');
const { Resend } = require('resend');
const { dailySummary } = require('@/emailTemplate/dailySummary');

const Payment = mongoose.model('Payment');
const Booking = mongoose.model('Booking');
const PettyCashTransaction = mongoose.model('PettyCashTransaction');
const InventoryTransaction = mongoose.model('InventoryTransaction');
const GoodsReceipt = mongoose.model('GoodsReceipt');
const Admin = mongoose.model('Admin');

const runDailySummary = async (manualRecipient = null) => {
    try {
        console.log('--- Starting Daily Summary Cron Job ---');
        // Fix: Use IST Timezone
        const startOfDay = moment().utcOffset('+05:30').startOf('day').toDate();
        const endOfDay = moment().utcOffset('+05:30').endOf('day').toDate();

        console.log(`Report Window: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

        // 1. Fetch Today's Income (Payments)
        const payments = await Payment.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            removed: false
        });
        const officialIncome = payments.filter(p => p.ledger === 'official').reduce((sum, p) => sum + p.amount, 0);
        const internalIncome = payments.filter(p => p.ledger === 'internal').reduce((sum, p) => sum + p.amount, 0);
        const totalIncome = officialIncome + internalIncome;
        console.log(`Found ${payments.length} payments. Official: ${officialIncome}, Internal: ${internalIncome}`);

        // 2. Fetch Expenses (Combined)
        const [pettyCash, mainExpenses] = await Promise.all([
            PettyCashTransaction.find({
                date: { $gte: startOfDay, $lte: endOfDay },
                type: 'outward',
                removed: false
            }),
            mongoose.model('Expense').find({
                date: { $gte: startOfDay, $lte: endOfDay },
                removed: false
            })
        ]);

        const pettyCashExpenses = pettyCash.reduce((sum, e) => sum + e.amount, 0);

        const supplierExpenses = mainExpenses
            .filter(e => e.recipientType === 'Supplier')
            .reduce((sum, e) => sum + e.amount, 0);

        const labourExpenses = mainExpenses
            .filter(e => e.recipientType === 'Labour')
            .reduce((sum, e) => sum + e.amount, 0);

        const otherExpenses = mainExpenses
            .filter(e => e.recipientType === 'Other')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalExpenses = pettyCashExpenses + supplierExpenses + labourExpenses + otherExpenses;

        console.log(`Expenses Breakdown: PettyCash=${pettyCashExpenses}, Supplier=${supplierExpenses}, Labour=${labourExpenses}, Other=${otherExpenses}`);

        // 3. Fetch New Bookings
        const bookings = await Booking.find({
            bookingDate: { $gte: startOfDay, $lte: endOfDay },
            removed: false
        }).populate('client villa');
        console.log(`Found ${bookings.length} new bookings`);

        // 4. Fetch Inventory Logs (Check both Transactions and Receipts)
        const [invLogs, receipts] = await Promise.all([
            InventoryTransaction.find({
                date: { $gte: startOfDay, $lte: endOfDay }
            }).populate('material'),
            GoodsReceipt.find({
                date: { $gte: startOfDay, $lte: endOfDay }
            }).populate('items.material')
        ]);

        let mergedLogs = [...invLogs];

        // Convert GoodsReceipt items to similar format for email
        receipts.forEach(receipt => {
            receipt.items.forEach(item => {
                mergedLogs.push({
                    material: item.material,
                    type: 'inward (Receipt)',
                    quantity: item.quantity
                });
            });
        });

        console.log(`Found ${invLogs.length} inventory transactions and ${receipts.length} receipts`);

const nodemailer = require('nodemailer');
        
        // 5. Get Recipient (Manual override or First Owner)
        const admin = await Admin.findOne({ role: 'owner', removed: false });
        let recipientEmail = manualRecipient;
        
        if (!recipientEmail) {
            // Use .env ADMIN_EMAIL explicitly if the DB admin email is the default dummy one
            if (admin && admin.email !== 'admin@admin.com') {
                recipientEmail = admin.email;
            } else {
                recipientEmail = process.env.ADMIN_EMAIL;
            }
        }

        if (!recipientEmail || recipientEmail === 'your_actual_email@example.com' || !process.env.EMAIL_USER) {
            console.error('Missing email configuration: Please set a valid EMAIL_USER, EMAIL_PASSWORD, and ADMIN_EMAIL in backend/.env.');
            return;
        }

        // 6. Send Email using Nodemailer
        const htmlContent = dailySummary({
            income: totalIncome,
            officialIncome,
            internalIncome,
            expenses: totalExpenses,
            breakdown: {
                pettyCash: pettyCashExpenses,
                supplier: supplierExpenses,
                labour: labourExpenses,
                other: otherExpenses
            },
            bookings,
            inventoryLogs: mergedLogs,
            date: moment().utcOffset('+05:30').format('DD/MM/YYYY')
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: `"BrickFlow ERP" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `Daily Summary - ${moment().utcOffset('+05:30').format('DD/MM/YYYY')}`,
            html: htmlContent
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Failed to send daily summary:', error);
            } else {
                console.log('Daily summary sent successfully:', info.messageId);
            }
        });

    } catch (err) {
        console.error('Error in Daily Summary Cron:', err);
    }
};

// Schedule: 8:00 PM every day (IST)
const initCron = () => {
    // 0 20 * * * = 8:00 PM
    // Use timezone: "Asia/Kolkata" to force IST execution
    cron.schedule('0 20 * * *', () => {
        console.log(`[CRON] Triggering Daily Summary at ${new Date().toISOString()}`);
        runDailySummary();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    console.log('Daily Summary Cron Scheduled for 8:00 PM IST (Asia/Kolkata)');
};

module.exports = {
    initCron,
    runDailySummary // Export for manual trigger/testing
};
