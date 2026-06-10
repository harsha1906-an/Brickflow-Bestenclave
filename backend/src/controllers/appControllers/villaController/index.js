const Villa = require('@/models/appModels/Villa');
const fs = require('fs');
const path = require('path');

const create = async (req, res) => {
    try {
        const body = req.body;
        console.log('Creating Villa with body:', body);
        if (req.admin && req.admin.companyId) {
            body.companyId = req.admin.companyId;
        }
        const villa = new Villa(body);
        await villa.save();
        return res.status(200).json({ success: true, result: villa, message: 'Villa created successfully' });
    } catch (error) {
        console.error('Create Villa Error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Villa number already exists.', error: error.message });
        }
        return res.status(500).json({ success: false, message: 'Failed to create villa', error: error.message });
    }
};

const list = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = parseInt(req.query.items) || 10;
        const skip = page * limit - limit;

        // Simple filter support
        const { status, q, projectId } = req.query;
        let query = { removed: false };
        if (status) query.status = status;
        if (projectId) query.projectId = projectId;
        if (q) {
            query.villaNumber = { $regex: q, $options: 'i' };
        }

        const villas = await Villa.find(query)
            .populate('projectId', 'name') // Populate project details
            .sort({ created: -1 })
            .skip(skip)
            .limit(limit);

        const count = await Villa.countDocuments(query);
        const pages = Math.ceil(count / limit);

        try {
            const logPath = path.join(process.cwd(), 'list_debug.txt');
            const logMessage = `[${new Date().toISOString()}] List Query: ${JSON.stringify(query)}\nFound: ${villas.length}\n`;
            fs.appendFileSync(logPath, logMessage);
        } catch (e) {
            console.error('Failed to log list', e);
        }

        return res.status(200).json({
            success: true,
            result: villas,
            pagination: { page, pages, count }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to list villas', error: error.message });
    }
};

const read = async (req, res) => {
    try {
        const { id } = req.params;
        const villa = await Villa.findOne({ _id: id, removed: false });
        if (!villa) {
            return res.status(404).json({ success: false, message: 'Villa not found' });
        }
        return res.status(200).json({ success: true, result: villa });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to read villa', error: error.message });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const villa = await Villa.findOneAndUpdate(
            { _id: id, removed: false },
            updates,
            { new: true, runValidators: true }
        );
        if (!villa) {
            return res.status(404).json({ success: false, message: 'Villa not found' });
        }
        return res.status(200).json({ success: true, result: villa, message: 'Villa updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update villa', error: error.message });
    }
};

const deleteController = async (req, res) => {
    try {
        const { id } = req.params;
        const villa = await Villa.findOneAndUpdate(
            { _id: id, removed: false },
            { removed: true },
            { new: true }
        );
        if (!villa) {
            return res.status(404).json({ success: false, message: 'Villa not found' });
        }
        return res.status(200).json({ success: true, result: villa, message: 'Villa deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete villa', error: error.message });
    }
};

const search = async (req, res) => {
    const { q } = req.query;
    try {
        const regex = new RegExp(q, 'i');
        const villas = await Villa.find({
            removed: false,
            $or: [{ villaNumber: regex }, { houseType: regex }]
        }).limit(20);
        return res.status(200).json({ success: true, result: villas });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
};

const filter = async (req, res) => {
    return list(req, res);
};

const listAll = async (req, res) => {
    try {
        const villas = await Villa.find({ removed: false }).sort({ created: -1 });
        return res.status(200).json({ success: true, result: villas, pagination: { page: 1, pages: 1, count: villas.length } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to list all villas', error: error.message });
    }
};

const summary = async (req, res) => {
    return res.status(200).json({ success: true, result: [] });
}

const progressSummary = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const companyId = req.params.companyId || req.query.companyId;

        console.log('\n=== BACKEND PROGRESS SUMMARY ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Path:', req.originalUrl);
        console.log('Req Params:', req.params);
        console.log('Resolved CompanyId:', companyId);

        if (!companyId) {
            console.error('ERROR: No companyId found in params or query');
            return res.status(400).json({
                success: false,
                message: 'Company ID is required'
            });
        }

        const role = req.admin?.role || 'engineer';
        const isFinancialAllowed = ['owner', 'manager', 'accountant'].includes(role);

        const LabourContract = mongoose.model('LabourContract');
        const Payment = mongoose.model('Payment');
        const Expense = mongoose.model('Expense');

        // Get all villas for the company
        console.log('Querying villas...');
        const villas = await Villa.find({ companyId, removed: false })
            .select('name villaNumber projectId')
            .populate('projectId', 'name')
            .sort({ villaNumber: 1 });

        console.log('Found villas:', villas.length);
        console.log('Sample:', villas.slice(0, 2));

        // Calculate progress for each villa based on labour contract milestones
        const villasWithProgress = await Promise.all(villas.map(async (villa) => {
            // Find all labour contracts for this villa
            const contracts = await LabourContract.find({
                companyId,
                villa: villa._id,
                removed: false
            }).populate('labour', 'name skill');

            if (!contracts || contracts.length === 0) {
                // No contracts = Not Started
                
                // Still calculate generic financials if any and allowed
                let totalIncome = 0;
                let totalExpense = 0;
                if (isFinancialAllowed) {
                    const payments = await Payment.find({ villa: villa._id, removed: false });
                    totalIncome = payments.reduce((sum, item) => sum + (item.amount || 0), 0);

                    const expenses = await Expense.find({ villa: villa._id, removed: false });
                    totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
                }

                return {
                    _id: villa._id,
                    name: villa.name,
                    villaNumber: villa.villaNumber,
                    project: villa.projectId,
                    stage: 'Not Started',
                    percentage: 0,
                    lastUpdated: null,
                    totalContracts: 0,
                    completedMilestones: 0,
                    totalMilestones: 0,
                    income: totalIncome,
                    expense: totalExpense
                };
            }

            // Calculate completion based on milestones
            let totalMilestones = 0;
            let completedMilestones = 0;
            let lastCompletionDate = null;
            let currentStage = 'Not Started';

            contracts.forEach(contract => {
                if (contract.milestones && contract.milestones.length > 0) {
                    totalMilestones += contract.milestones.length;
                    contract.milestones.forEach(milestone => {
                        if (milestone.isCompleted) {
                            completedMilestones++;
                            // Track latest completion date
                            if (milestone.completionDate) {
                                if (!lastCompletionDate || new Date(milestone.completionDate) > new Date(lastCompletionDate)) {
                                    lastCompletionDate = milestone.completionDate;
                                }
                            }
                        }
                    });
                }
            });

            // Calculate percentage
            const percentage = totalMilestones > 0
                ? Math.round((completedMilestones / totalMilestones) * 100)
                : 0;

            // Determine stage based on percentage
            if (percentage === 0) {
                currentStage = 'Not Started';
            } else if (percentage < 25) {
                currentStage = 'foundation';
            } else if (percentage < 50) {
                currentStage = 'structure';
            } else if (percentage < 75) {
                currentStage = 'plastering';
            } else if (percentage < 100) {
                currentStage = 'finishing';
            } else {
                currentStage = 'finishing'; // Completed
            }

            // Calculate Income and Expense only if allowed
            let totalIncome = 0;
            let totalExpense = 0;
            if (isFinancialAllowed) {
                const payments = await Payment.find({
                    villa: villa._id,
                    removed: false
                });
                totalIncome = payments.reduce((sum, item) => sum + (item.amount || 0), 0);

                const expenses = await Expense.find({
                    villa: villa._id,
                    removed: false
                });
                totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
            }

            return {
                _id: villa._id,
                name: villa.name,
                villaNumber: villa.villaNumber,
                project: villa.projectId,
                stage: currentStage,
                percentage: percentage,
                lastUpdated: lastCompletionDate,
                totalContracts: contracts.length,
                completedMilestones: completedMilestones,
                totalMilestones: totalMilestones,
                income: totalIncome,
                expense: totalExpense
            };
        }));

        return res.status(200).json({
            success: true,
            result: villasWithProgress
        });
    } catch (error) {
        console.error('Progress Summary Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch villa progress',
            error: error.message
        });
    }
}

module.exports = {
    create,
    list,
    read,
    update,
    delete: deleteController,
    search,
    filter,
    listAll,
    summary,
    progressSummary,
    downloadVillaReport: require('@/controllers/pdfController').downloadVillaReport
};
