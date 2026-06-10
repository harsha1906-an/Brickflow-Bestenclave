const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const Expense = require('@/models/appModels/Expense');
const Labour = require('@/models/appModels/Labour');
const LabourContract = require('@/models/appModels/LabourContract');

const methods = createCRUDController('Expense');

// Custom create method to handle number generation
methods.create = async (req, res) => {
    try {
        const { companyId } = req.body; // Should be in body or req.admin
        // Find max number
        const lastExpense = await Expense.findOne({ companyId: req.admin.companyId || companyId }).sort({ number: -1 });
        const number = lastExpense ? lastExpense.number + 1 : 1;

        req.body.number = number;
        req.body.companyId = req.admin.companyId || companyId;
        req.body.removed = false;

        const result = await new Expense(req.body).save();

        return res.status(200).json({
            success: true,
            result,
            message: 'Expense created successfully',
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        return res.status(400).json({
            success: false,
            message: 'Error creating expense',
            error: error.message
        });
    }
};

// Custom list method with filtering support
methods.list = async (req, res) => {
    try {
        const { page = 1, items = 10, startDate, endDate, recipientType, villa, labourSkill, supplier } = req.query;
        // Use companyID from admin if available, otherwise don't filter by it (matches generic behavior)
        const companyId = req.admin.companyId;

        let filter = {
            removed: false,
        };

        if (companyId) {
            filter.companyId = companyId;
        }

        // Date range filter
        if (startDate && endDate) {
            filter.date = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) // Include full end date
            };
        }

        // Recipient type filter
        if (recipientType && recipientType !== 'all') {
            filter.recipientType = recipientType;
        }

        if (supplier) {
            filter.supplier = supplier;
        }

        const { supplierType } = req.query;
        if (supplierType && supplierType !== 'all') {
            const Supplier = require('@/models/appModels/Supplier');
            const suppliersWithType = await Supplier.find({
                removed: false,
                supplierType: supplierType,
                ...(companyId ? { companyId } : {})
            }).distinct('_id');

            if (suppliersWithType.length > 0) {
                filter.supplier = { $in: suppliersWithType };
            } else {
                return res.status(200).json({
                    success: true,
                    result: [],
                    pagination: { page: parseInt(page), pages: 0, total: 0 }
                });
            }
        }

        // Labour-specific filters
        if (recipientType === 'Labour') {
            // Villa filter - now direct field on Expense
            if (villa) {
                filter.villa = villa;
            }

            // Labour skill filter
            if (labourSkill && labourSkill !== 'all') {
                const labourQuery = {
                    removed: false,
                    skill: labourSkill
                };
                if (companyId) {
                    labourQuery.companyId = companyId;
                }

                const labourWithSkill = await Labour.find(labourQuery).distinct('_id');

                if (labourWithSkill.length > 0) {
                    filter.labour = { $in: labourWithSkill };
                } else {
                    // No labour with this skill, return empty
                    return res.status(200).json({
                        success: true,
                        result: [],
                        pagination: {
                            page: parseInt(page),
                            pages: 0,
                            total: 0
                        }
                    });
                }
            }
        }

        const skip = (page - 1) * items;

        console.log('Final Filter Object:', JSON.stringify(filter, null, 2));

        const expenses = await Expense.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(parseInt(items))
            .populate('supplier')
            .populate('labour');

        const total = await Expense.countDocuments(filter);

        console.log('Found expenses:', expenses.length);
        console.log('Total count:', total);

        return res.status(200).json({
            success: true,
            result: expenses,
            pagination: {
                page: parseInt(page),
                pages: Math.ceil(total / items),
                total
            }
        });
    } catch (error) {
        console.error('Error listing expenses:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching expenses',
            error: error.message
        });
    }
};

methods.delete = async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Soft Delete the Expense
        const expense = await Expense.findByIdAndUpdate(
            id,
            { removed: true },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        // 2. Find linked Labour Contract Milestone and Reset it
        const contract = await LabourContract.findOne({ 'milestones.expenseId': id });

        if (contract) {
            const milestoneIndex = contract.milestones.findIndex(m => m.expenseId && m.expenseId.toString() === id);
            
            if (milestoneIndex !== -1) {
                contract.milestones[milestoneIndex].isCompleted = false;
                contract.milestones[milestoneIndex].expenseId = null;
                contract.milestones[milestoneIndex].netAmount = 0;
                contract.milestones[milestoneIndex].advanceDeduction = 0;
                contract.milestones[milestoneIndex].penalty = 0;
                contract.milestones[milestoneIndex].completionDate = null;
                contract.milestones[milestoneIndex].paymentMode = null;
                contract.milestones[milestoneIndex].reference = null;
                
                await contract.save();
                console.log(`Unlinked Expense ${id} from LabourContract ${contract._id} milestone`);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Expense deleted and unlinked successfully',
            result: expense
        });

    } catch (error) {
        console.error('Error deleting expense:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting expense',
            error: error.message
        });
    }
};

module.exports = methods;
