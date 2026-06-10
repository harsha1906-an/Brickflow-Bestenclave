const Booking = require('../../models/appModels/Booking');
const Villa = require('../../models/appModels/Villa');
const Client = require('../../models/appModels/Client');
const whatsappService = require('../../services/whatsappService');
const { runInTransaction } = require('../../utils/transactionHelper');

const create = async (req, res) => {
    const bookingData = req.body;
    const createdBy = req.admin._id;

    try {
        const result = await runInTransaction(async (session) => {
            // 1. Check if Villa is available
            const villa = await Villa.findOne({ _id: bookingData.villa }).session(session);

            if (!villa) {
                throw new Error('Villa not found');
            }

            if (villa.status && villa.status.toLowerCase() !== 'available') {
                throw new Error('Villa is not available for booking');
            }

            // 2. Create Booking
            if (villa.companyId) {
                bookingData.companyId = villa.companyId;
            }

            const booking = new Booking(bookingData);
            await booking.save({ session });

            // 3. Update Villa Status
            villa.status = 'booked';
            await villa.save({ session });

            return booking;
        });

        // Send WhatsApp Notification (asynchronously, after transaction commits)
        try {
            const client = await Client.findOne({ _id: bookingData.client, removed: false });
            if (client && client.phone) {
                await whatsappService.sendTemplate(client.phone, 'booking_successful', 'en_US', [
                    { type: 'text', text: result.villaNumber || 'Villa' },
                    { type: 'text', text: result._id.toString() }
                ]);
            }
        } catch (err) {
            console.error('Failed to send WhatsApp notification:', err);
        }

        return res.status(200).json({ success: true, result, message: 'Booking created successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
    }
};

const list = async (req, res) => {
    try {
        const { page = 1, items = 10, ...queryParams } = req.query;
        const limit = parseInt(items);
        const skip = page * limit - limit;

        const query = { removed: false };
        // Allow filtering by specific fields if present in query
        if (queryParams.villa) query.villa = queryParams.villa;
        if (queryParams.client) query.client = queryParams.client;
        if (queryParams.status) query.status = queryParams.status;

        const bookings = await Booking.find(query)
            .populate('villa')
            .populate('client')
            .sort({ created: -1 })
            .skip(skip)
            .limit(limit);

        const count = await Booking.countDocuments(query);
        const pages = Math.ceil(count / limit);

        return res.status(200).json({
            success: true,
            result: bookings,
            pagination: { page, pages, count }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to list bookings', error: error.message });
    }
};

const read = async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await Booking.findOne({ _id: id, removed: false }).populate('villa').populate('client');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        return res.status(200).json({ success: true, result: booking });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to read booking', error: error.message });
    }
};

const update = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
        const result = await runInTransaction(async (session) => {
            const booking = await Booking.findOne({ _id: id, removed: false }).session(session);
            if (!booking) {
                throw new Error('Booking not found');
            }

            Object.assign(booking, updates);

            if (updates.status === 'cancelled') {
                const villa = await Villa.findOne({ _id: booking.villa }).session(session);
                if (villa) {
                    villa.status = 'available';
                    await villa.save({ session });
                }
            }

            await booking.save({ session });
            return booking;
        });

        return res.status(200).json({ success: true, result, message: 'Booking updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update booking', error: error.message });
    }
};

const search = async (req, res) => {
    // Basic search implementation required by ErpPanel
    const { q } = req.query; // query string
    try {
        const regex = new RegExp(q, 'i');
        // Search by Client name or Villa number? 
        // Logic might need aggregation if searching related fields.
        // For now simple search on direct fields or return generic list
        // Assuming we might have a booking number or similar.
        const bookings = await Booking.find({ removed: false }).limit(20).populate('client');
        return res.status(200).json({ success: true, result: bookings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
};

const filter = async (req, res) => {
    // Basic filter implementation reusing list for now or implementing specific logic
    return list(req, res);
};

const listAll = async (req, res) => {
    // listAll typically returns everything without pagination, but for consistency lets return all
    // or just large limit. 
    try {
        const bookings = await Booking.find({ removed: false }).sort({ created: -1 }).populate('villa').populate('client');
        return res.status(200).json({ success: true, result: bookings, pagination: { page: 1, pages: 1, count: bookings.length } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to list all bookings', error: error.message });
    }
};

const summary = async (req, res) => {
    return res.status(200).json({ success: true, result: [] });
}

const receipt = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking.findOne({
            _id: id,
            removed: false,
        })
            .populate('client')
            .populate('villa')
            .exec();

        if (!booking) {
            return res.status(404).json({
                success: false,
                result: null,
                message: 'Booking not found',
            });
        }

        const { numberToWords } = require('@/helpers');
        const pdfController = require('@/controllers/pdfController');

        const model = {
            ...booking.toObject(),
            inWords: numberToWords(booking.downPayment || 0),
        };

        const filename = `BookingReceipt_${booking._id}.pdf`;

        // Generate PDF Buffer
        const pdfBuffer = await pdfController.generatePdf(
            'BookingReceipt',
            { filename, format: 'A5' }, // targetLocation removed
            model
        );

        // Send Buffer
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });

        return res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error('Receipt generation error:', error);
        return res.status(500).json({ success: false, message: 'Failed to generate receipt' });
    }
};


module.exports = {
    create,
    list,
    read,
    update,
    search,
    filter,
    listAll,
    listAll,
    summary,
    receipt
};
