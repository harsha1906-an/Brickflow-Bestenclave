const mongoose = require('mongoose');

const paginatedList = async (req, res) => {
    const Model = mongoose.model('Payment');
    try {
        const page = req.query.page || 1;
        const limit = parseInt(req.query.items) || 10;
        const skip = page * limit - limit;

        const { sortBy = 'created', sortValue = -1, filter, equal } = req.query;

        const fieldsArray = req.query.fields ? req.query.fields.split(',') : [];

        let fields;

        fields = fieldsArray.length === 0 ? {} : { $or: [] };

        for (const field of fieldsArray) {
            fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
        }

        // Construct the query object
        const query = {
            removed: false,
            ...fields,
        };
        if (filter && equal) {
            query[filter] = equal;
        }
        // Support filtering by booking ID
        if (req.query.booking) {
            query.booking = req.query.booking;
        }
        // Support filtering by client ID
        if (req.query.client) {
            query.client = req.query.client;
        }

        //  Query the database for a list of all results with deep population
        const resultsPromise = Model.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ [sortBy]: sortValue })
            .populate('client villa invoice')
            .exec();

        // Counting the total documents
        const countPromise = Model.countDocuments(query);
        // Resolving both promises
        const [result, count] = await Promise.all([resultsPromise, countPromise]);

        // Calculating total pages
        const pages = Math.ceil(count / limit);

        // Getting Pagination Object
        const pagination = { page, pages, count };
        if (count > 0) {
            return res.status(200).json({
                success: true,
                result,
                pagination,
                message: 'Successfully found all documents',
            });
        } else {
            return res.status(203).json({
                success: true,
                result: [],
                pagination,
                message: 'Collection is Empty',
            });
        }
    } catch (error) {
        console.log("PAYMENT LIST ERROR:", error);
        try {
            require('fs').appendFileSync('error_log.txt', 'LIST ERROR: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\nStack: ' + error.stack + '\n');
        } catch (fsErr) {
            console.error("Failed to write error log", fsErr);
        }
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error: ' + error.message,
        });
    }
};

module.exports = paginatedList;
