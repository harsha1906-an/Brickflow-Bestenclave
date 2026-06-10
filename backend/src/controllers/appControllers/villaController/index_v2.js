const mongoose = require('mongoose');
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
        const items = parseInt(req.query.items) || 10;
        const skip = page * items - items;

        const companyId = req.query.companyId || req.params.companyId || (req.admin && req.admin.companyId);

        const { status, q, projectId } = req.query;
        let query = { removed: false };

        if (companyId) {
            query.companyId = companyId;
        }

        if (status) query.status = status;
        if (projectId) query.projectId = projectId;
        if (q) {
            query.villaNumber = { $regex: q, $options: 'i' };
        }

        const villas = await Villa.find(query)
            .populate('projectId', 'name')
            .sort({ created: -1 })
            .skip(skip)
            .limit(items)
            .lean();

        const count = await Villa.countDocuments(query);
        const pages = Math.ceil(count / items);

        // Debug log for list queries
        try {
            const logPath = path.join(process.cwd(), 'list_debug.txt');
            const logMessage = `[${new Date().toISOString()}] List Query: ${JSON.stringify(query)}\nFound: ${villas.length}\n`;
            fs.appendFileSync(logPath, logMessage);
        } catch (e) {
            // ignore
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
        const companyId = req.params.companyId || req.query.companyId || (req.admin && req.admin.companyId);

        console.log('\n=== BACKEND PROGRESS SUMMARY (ROBUST VERSION) ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Provided CompanyId:', companyId);

        if (!companyId) {
            console.error('ERROR: No companyId found');
            return res.status(400).json({ success: false, message: 'Company ID is required' });
        }

        const LabourContract = mongoose.model('LabourContract');
        const Payment = mongoose.model('Payment');
        const Expense = mongoose.model('Expense');

        // Robust Query Strategy
        let query = { removed: false };
        let companyIdQuery = [];
        companyIdQuery.push({ companyId: companyId }); // Raw value
        if (mongoose.Types.ObjectId.isValid(companyId)) {
            companyIdQuery.push({ companyId: new mongoose.Types.ObjectId(companyId) }); // ObjectId
        }
        query.$or = companyIdQuery;

        console.log('Querying villas:', JSON.stringify(query));

        // Use lean() for performance
        const villas = await Villa.find(query)
            .select('name villaNumber projectId companyId')
            .populate('projectId', 'name')
            .sort({ villaNumber: 1 })
            .lean();

        console.log('Found villas:', villas.length);

        const villasWithProgress = await Promise.all(villas.map(async (villa) => {
            const villaId = villa._id;

            // Find contracts - ensure consistent ID usage
            const contracts = await LabourContract.find({
                villa: villaId,
                removed: false
            }).populate('labour', 'name skill').lean();

            // Default values
            let currentStage = 'Not Started';
            let percentage = 0;
            let lastCompletionDate = null;
            let completedMilestones = 0;
            let totalMilestones = 0;

            if (contracts && contracts.length > 0) {
                 contracts.forEach(contract => {
                    if (contract.milestones && contract.milestones.length > 0) {
                        totalMilestones += contract.milestones.length;
                        contract.milestones.forEach(milestone => {
                            if (milestone.isCompleted) {
                                completedMilestones++;
                                if (milestone.completionDate) {
                                    if (!lastCompletionDate || new Date(milestone.completionDate) > new Date(lastCompletionDate)) {
                                        lastCompletionDate = milestone.completionDate;
                                    }
                                }
                            }
                        });
                    }
                });

                percentage = totalMilestones > 0
                    ? Math.round((completedMilestones / totalMilestones) * 100)
                    : 0;

                if (percentage === 0) {
                    currentStage = 'Not Started';
                } else if (percentage < 25) {
                    currentStage = 'Foundation';
                } else if (percentage < 50) {
                    currentStage = 'Structure';
                } else if (percentage < 75) {
                    currentStage = 'Plastering';
                } else if (percentage < 100) {
                    currentStage = 'Finishing';
                } else {
                    currentStage = 'Completed';
                }
            }

            // Financials
            const payments = await Payment.find({ villa: villaId, removed: false }).lean();
            const totalIncome = payments.reduce((sum, item) => sum + (item.amount || 0), 0);

            const expenses = await Expense.find({ villa: villaId, removed: false }).lean();
            const totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
            
            return {
                _id: villaId,
                name: villa.name,
                villaNumber: villa.villaNumber,
                project: villa.projectId,
                stage: currentStage,
                percentage: percentage,
                lastUpdated: lastCompletionDate,
                totalContracts: contracts ? contracts.length : 0,
                completedMilestones: completedMilestones,
                totalMilestones: totalMilestones,
                income: totalIncome,
                expense: totalExpense
            };
        }));
        
        console.log('Sending result items:', villasWithProgress.length);

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
