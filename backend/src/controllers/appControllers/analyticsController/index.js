const mongoose = require('mongoose');
const moment = require('moment');
const { generateDailySummary } = require('@/modules/LabourModule/reporting.service');

/**
 * Get monthly analytics summary for income vs expenses
 * @route GET /api/analytics/monthly-summary
 * @query {string} range - 'today' or 'month' (default: 'month')
 * @query {number} months - Number of months to fetch (default: 7, only used when range=month)
 */
const getMonthlySummary = async (req, res) => {
    try {
        const { range = 'month', months = 7 } = req.query;
        console.log('=== Analytics Request ===');
        console.log('Range:', range);

        const Payment = mongoose.model('Payment');
        const PettyCashTransaction = mongoose.model('PettyCashTransaction');
        const Expense = mongoose.model('Expense');
        const Attendance = mongoose.model('Attendance');

        let monthlyData = [];

        if (range === 'today') {
            // For today view, show hourly data for the current day
            const startOfDay = moment().startOf('day').toDate();
            const endOfDay = moment().endOf('day').toDate();

            console.log('Today range:', startOfDay, 'to', endOfDay);

            // Get total payments (income) for today
            const paymentResult = await Payment.aggregate([
                {
                    $match: {
                        removed: false,
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            const income = paymentResult.length > 0 ? paymentResult[0].total : 0;
            console.log('Today Payments:', income, 'Result:', paymentResult);

            // Get total labour wages for today
            const labourResult = await Attendance.aggregate([
                {
                    $match: {
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$wage' }
                    }
                }
            ]);
            const labourCost = labourResult.length > 0 ? labourResult[0].total : 0;
            console.log('Today Labour:', labourCost, 'Result:', labourResult);

            // Get total petty cash expenses for today
            const pettyCashResult = await PettyCashTransaction.aggregate([
                {
                    $match: {
                        removed: false,
                        type: 'outward',
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            const pettyCashExpense = pettyCashResult.length > 0 ? pettyCashResult[0].total : 0;
            console.log('Today Petty Cash:', pettyCashExpense, 'Result:', pettyCashResult);

            // Get total general expenses for today
            const expenseResult = await Expense.aggregate([
                {
                    $match: {
                        removed: false,
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            const generalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
            console.log('Today Expenses:', generalExpense, 'Result:', expenseResult);

            // Calculate total expense
            const totalExpense = labourCost + pettyCashExpense + generalExpense;

            // Return single data point for today
            monthlyData = [{
                name: 'Today',
                month: moment().format('YYYY-MM-DD'),
                income: Math.round(income * 100) / 100,
                expense: Math.round(totalExpense * 100) / 100,
                breakdown: {
                    labour: Math.round(labourCost * 100) / 100,
                    pettyCash: Math.round(pettyCashExpense * 100) / 100,
                    general: Math.round(generalExpense * 100) / 100
                }
            }];

        } else {
            // For month/prev_month view, show daily data
            let targetMonth = moment();
            if (range === 'prev_month') {
                targetMonth = moment().subtract(1, 'months');
            }

            const startOfMonth = targetMonth.clone().startOf('month').toDate();
            const endOfMonth = targetMonth.clone().endOf('month').toDate();
            const daysInMonth = targetMonth.daysInMonth();

            console.log(`${range} range:`, startOfMonth, 'to', endOfMonth, `(${daysInMonth} days)`);

            for (let day = 1; day <= daysInMonth; day++) {
                const dayDate = targetMonth.clone().date(day);
                const startOfDay = dayDate.clone().startOf('day').toDate();
                const endOfDay = dayDate.clone().endOf('day').toDate();

                // Get total payments (income) for the day
                const paymentResult = await Payment.aggregate([
                    {
                        $match: {
                            removed: false,
                            date: {
                                $gte: startOfDay,
                                $lte: endOfDay
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);
                const income = paymentResult.length > 0 ? paymentResult[0].total : 0;

                // Get total labour wages for the day
                const labourResult = await Attendance.aggregate([
                    {
                        $match: {
                            date: {
                                $gte: startOfDay,
                                $lte: endOfDay
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$wage' }
                        }
                    }
                ]);
                const labourCost = labourResult.length > 0 ? labourResult[0].total : 0;

                // Get total petty cash expenses for the day
                const pettyCashResult = await PettyCashTransaction.aggregate([
                    {
                        $match: {
                            removed: false,
                            type: 'outward',
                            date: {
                                $gte: startOfDay,
                                $lte: endOfDay
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);
                const pettyCashExpense = pettyCashResult.length > 0 ? pettyCashResult[0].total : 0;

                // Get total general expenses for the day
                const expenseResult = await Expense.aggregate([
                    {
                        $match: {
                            removed: false,
                            date: {
                                $gte: startOfDay,
                                $lte: endOfDay
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);
                const generalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;

                // Calculate total expense
                const totalExpense = labourCost + pettyCashExpense + generalExpense;

                monthlyData.push({
                    name: dayDate.format('D'),
                    month: dayDate.format('YYYY-MM-DD'),
                    income: Math.round(income * 100) / 100,
                    expense: Math.round(totalExpense * 100) / 100,
                    breakdown: {
                        labour: Math.round(labourCost * 100) / 100,
                        pettyCash: Math.round(pettyCashExpense * 100) / 100,
                        general: Math.round(generalExpense * 100) / 100
                    }
                });
            }

            console.log(`Month view completed: ${monthlyData.length} days of data`);
            const totalIncome = monthlyData.reduce((sum, d) => sum + d.income, 0);
            const totalExpense = monthlyData.reduce((sum, d) => sum + d.expense, 0);
            console.log(`Total Income: ${totalIncome}, Total Expense: ${totalExpense}`);
        }

        const rangeLabel = range === 'today' ? 'today' : (range === 'prev_month' ? 'previous month' : 'this month');
        console.log('=== Returning Result ===');
        console.log('Data points:', monthlyData.length);

        return res.status(200).json({
            success: true,
            result: monthlyData,
            message: `Successfully fetched analytics for ${rangeLabel}`
        });

    } catch (error) {
        console.error('Error in getMonthlySummary:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getMonthlySummary
};
