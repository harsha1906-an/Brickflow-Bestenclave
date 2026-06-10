const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/idurar-erp-crm', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log("Connected to MongoDB");
        const db = mongoose.connection.db;
        const bookings = await db.collection('bookings').find({ removed: false }).sort({ _id: -1 }).limit(1).toArray();

        for (const booking of bookings) {
            console.log(`\nBooking ID: ${booking._id}`);
            console.log(`Total: ${booking.totalAmount}, Official: ${booking.officialAmount}, Internal: ${booking.internalAmount}`);

            const payments = await db.collection('payments').find({ booking: booking._id, removed: false }).toArray();
            let paidOfficial = 0; let paidInternal = 0; let unknown = 0;
            for (const p of payments) {
                if (p.ledger === 'official') paidOfficial += p.amount;
                else if (p.ledger === 'internal') paidInternal += p.amount;
                else unknown += p.amount;
            }

            console.log(`Payments -> Official: ${paidOfficial}, Internal: ${paidInternal}, Unknown: ${unknown}`);

            const pendingOfficial = (booking.officialAmount || 0) - paidOfficial;
            const pendingInternal = (booking.internalAmount || 0) - paidInternal;
            console.log(`Pending Official: ${pendingOfficial}, Pending Internal: ${pendingInternal}`);
        }

        mongoose.connection.close();
    })
    .catch(err => console.error(err));
