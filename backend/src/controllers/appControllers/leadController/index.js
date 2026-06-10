const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Lead');

// Override create to handle duplicate check logic
methods.create = async (req, res) => {
    try {
        const { phone, forceCreate } = req.body;

        // 1. Check for duplicate phone
        if (phone) {
            const existingLead = await mongoose.model('Lead').findOne({
                phone: phone,
                removed: false
            });

            if (existingLead) {
                // If duplicate exists and NOT forcing creation
                if (!forceCreate) {
                    return res.status(409).json({
                        success: false,
                        message: `Duplicate Lead found: ${existingLead.name} (${existingLead.status})`,
                        duplicate: true,
                        existingId: existingLead._id
                    });
                }
                // If enforcing duplicate check for non-owners (handled in frontend logic generally, 
                // but backend should theoretically reject if not admin. Simplified here per instructions).
            }
        }

        // 2. Standard creation logic
        const result = await new mongoose.model('Lead')(req.body).save();
        return res.status(200).json({
            success: true,
            result,
            message: 'Lead created successfully',
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Override update to handle Lost Logic validation and Duplicate Check
methods.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, lostReason, phone } = req.body;

        // Validation for Lost status
        if (status === 'Lost' && !lostReason) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required when marking a lead as Lost.',
            });
        }

        // Check for duplicate phone on update
        if (phone) {
            const existingLead = await mongoose.model('Lead').findOne({
                phone: phone,
                removed: false,
                _id: { $ne: id } // Exclude current lead
            });

            if (existingLead) {
                return res.status(409).json({
                    success: false,
                    message: `Duplicate phone number: ${existingLead.name} already has this number.`,
                });
            }
        }

        const result = await mongoose.model('Lead').findOneAndUpdate(
            { _id: id, removed: false },
            req.body,
            { new: true, runValidators: true }
        );

        if (!result) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        return res.status(200).json({
            success: true,
            result,
            message: 'Lead updated successfully',
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

methods.convert = async (req, res) => {
    try {
        const { id } = req.params;
        const Lead = mongoose.model('Lead');
        const Client = mongoose.model('Client');

        // 1. Find the lead
        const lead = await Lead.findOne({ _id: id, removed: false });
        if (!lead) {
            return res.status(404).json({
                success: false,
                result: null,
                message: 'Lead not found',
            });
        }

        if (lead.status === 'Converted') {
            return res.status(400).json({
                success: false,
                result: null,
                message: 'Lead is already converted',
            });
        }

        // 2. Create Customer (Client) from Lead data, merging custom fields from request body if present
        const clientData = {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            address: '',
            country: '',
            ...req.body,
            createdBy: req.admin._id,
            assigned: lead.assignedTo || req.admin._id,
        };

        const client = await new Client(clientData).save();

        // 3. Update Lead status
        lead.status = 'Converted';
        await lead.save();

        return res.status(200).json({
            success: true,
            result: client,
            message: 'Lead converted to Customer successfully',
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            result: null,
            message: error.message,
        });
    }
};

module.exports = methods;
