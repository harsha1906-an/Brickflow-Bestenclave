const mongoose = require('mongoose');
const moment = require('moment');

const generateDailySummary = async (companyId, date = new Date()) => {
    const Attendance = mongoose.model('Attendance');
    const InventoryTransaction = mongoose.model('InventoryTransaction');
    const Expense = mongoose.model('Expense');

    // Fix: Use IST Timezone
    const startOfDay = moment(date).utcOffset('+05:30').startOf('day').toDate();
    const endOfDay = moment(date).utcOffset('+05:30').endOf('day').toDate();

    const filter = {
        companyId,
        date: { $gte: startOfDay, $lte: endOfDay }
    };

    // 1. Labour Costs (from Attendance)
    const attendance = await Attendance.find(filter);
    const totalWage = attendance.reduce((sum, a) => sum + (a.wage || 0), 0);
    const totalAdvance = attendance.reduce((sum, a) => sum + (a.advanceDeduction || 0), 0);
    const totalPenalty = attendance.reduce((sum, a) => sum + (a.penalty || 0), 0);

    // 2. Inventory Inward/Outward
    const inventory = await InventoryTransaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        removed: false
    }).populate('material');

    const inwardCount = inventory.filter(i => i.type === 'inward').length;
    const outwardCount = inventory.filter(i => i.type === 'outward').length;

    // 3. Customer Collections (Stage-wise)
    const Payment = mongoose.model('Payment');
    const collections = await Payment.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        removed: false,
        amount: { $gt: 0 }
    });
    const totalCollections = collections.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Petty Cash Expenses
    const PettyCashTransaction = mongoose.model('PettyCashTransaction');
    const pettyCash = await PettyCashTransaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        type: 'outward',
        removed: false
    });
    const totalPettyCash = pettyCash.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 5. New Expenses Module (Breakdown)
    const expenses = await Expense.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        removed: false
    });

    // Categorize Main Expenses
    const supplierExpenses = expenses.filter(e => e.recipientType === 'Supplier').reduce((sum, e) => sum + e.amount, 0);
    const labourExpenses = expenses.filter(e => e.recipientType === 'Labour').reduce((sum, e) => sum + e.amount, 0);
    const otherExpenses = expenses.filter(e => e.recipientType === 'Other').reduce((sum, e) => sum + e.amount, 0);
    const totalMainExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
        date: moment(date).utcOffset('+05:30').format('DD MMM YYYY'),
        labour: {
            netWage: totalWage,
            advances: totalAdvance,
            penalties: totalPenalty,
            count: attendance.length
        },
        inventory: {
            inward: inwardCount,
            outward: outwardCount
        },
        pettyCash: {
            expense: totalPettyCash,
            count: pettyCash.length
        },
        expenses: {
            amount: totalMainExpenses,
            supplier: supplierExpenses,
            labourContract: labourExpenses,
            other: otherExpenses,
            count: expenses.length
        },
        customerCollections: totalCollections,
        totalDailyExpense: totalWage + totalPettyCash + totalMainExpenses,
        items: (await getSingleDayReportData(companyId, date)).items
    };
};

// Helper to gather detailed data for PDF (Single Day)
async function getSingleDayReportData(companyId, date) {
    const Expense = mongoose.model('Expense');
    const PettyCashTransaction = mongoose.model('PettyCashTransaction');
    const Attendance = mongoose.model('Attendance');

    // Fix: Use IST Timezone
    const startOfDay = moment(date).utcOffset('+05:30').startOf('day').toDate();
    const endOfDay = moment(date).utcOffset('+05:30').endOf('day').toDate();
    const dateStr = moment(date).utcOffset('+05:30').format('DD/MM/YYYY');

    const items = [];

    // 1. Fetch Expenses (Detailed)
    const expenses = await Expense.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        removed: false
    }).populate('supplier labour');

    for (const exp of expenses) {
        let payee = 'N/A';
        if (exp.recipientType === 'Supplier' && exp.supplier) payee = exp.supplier.name;
        else if (exp.recipientType === 'Labour' && exp.labour) payee = exp.labour.name;
        else if (exp.recipientType === 'Other') payee = exp.otherRecipient || 'Other';

        items.push({
            _id: exp._id,
            type: 'expense',
            category: exp.recipientType,
            payee: payee,
            description: exp.description || exp.ref || '-',
            amount: exp.amount,
            color: '#ffebee' // Red tint
        });
    }

    // 2. Fetch Petty Cash (Expense)
    const pettyCash = await PettyCashTransaction.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        type: 'outward',
        removed: false
    });

    for (const pc of pettyCash) {
        items.push({
            _id: pc._id,
            type: 'expense',
            category: 'Petty Cash',
            payee: 'Cash',
            description: pc.name || pc.note || '-',
            amount: pc.amount,
            color: '#ffebee'
        });
    }

    // 3. Labour Wages (Expense)
    const attendance = await Attendance.find({
        companyId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });
    const totalWage = attendance.reduce((sum, a) => sum + (a.wage || 0), 0);
    const count = attendance.length;

    if (totalWage > 0) {
        items.push({
            type: 'expense',
            category: 'Wages',
            payee: `${count} Workers`,
            description: 'Daily Labour Wages Cons.',
            amount: totalWage,
            color: '#ffebee'
        });
    }

    // 4. Fetch Income (Payments)
    const Payment = mongoose.model('Payment');
    const payments = await Payment.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        removed: false,
        amount: { $gt: 0 }
    }).populate('client villa');

    for (const p of payments) {
        let payee = p.client ? p.client.name : 'Unknown Client';
        let desc = p.villa ? `Villa: ${p.villa.villaNumber}` : '-';
        if (p.description) desc += ` | ${p.description}`;

        items.push({
            _id: p._id,
            type: 'income',
            category: 'Collection',
            payee: payee,
            description: desc,
            amount: p.amount,
            color: '#e8f5e9' // Green tint
        });
    }

    // Calculate Totals
    const totalExpense = items.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
    const totalIncome = items.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);

    return {
        date: dateStr,
        items,
        totalExpense,
        totalIncome,
        netBalance: totalIncome - totalExpense
    };
};

// Main function to handle date ranges
const getDailyReportData = async (companyId, date, endDate = null) => {
    if (!endDate) {
        // Single date (Legacy)
        return await getSingleDayReportData(companyId, date);
    } else {
        // Date Range
        const start = moment(date);
        const end = moment(endDate);
        const days = [];
        const reports = [];

        let current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            days.push(current.clone());
            current.add(1, 'days');
        }

        // Fetch properly for each day
        for (const day of days) {
            const report = await getSingleDayReportData(companyId, day.toDate());
            reports.push(report);
        }

        return reports;
    }
};

module.exports = { generateDailySummary, getDailyReportData };
