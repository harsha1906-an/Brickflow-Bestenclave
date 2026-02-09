require('module-alias/register');
const custom = require('./src/controllers/pdfController');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// MOCK MONGOOSE MODELS TO BYPASS DEPENDENCY ERRORS
if (!mongoose.models.Setting) {
    mongoose.model('Setting', new mongoose.Schema({}));
}
if (!mongoose.models.Client) {
    mongoose.model('Client', new mongoose.Schema({}));
}
if (!mongoose.models.Supplier) {
    mongoose.model('Supplier', new mongoose.Schema({}));
}
if (!mongoose.models.Booking) {
    mongoose.model('Booking', new mongoose.Schema({}));
}
if (!mongoose.models.Payment) {
    mongoose.model('Payment', new mongoose.Schema({}));
}
if (!mongoose.models.Labour) {
    mongoose.model('Labour', new mongoose.Schema({}));
}
if (!mongoose.models.Villa) {
    mongoose.model('Villa', new mongoose.Schema({}));
}
if (!mongoose.models.Expense) {
    mongoose.model('Expense', new mongoose.Schema({}));
}
if (!mongoose.models.InventoryTransaction) {
    mongoose.model('InventoryTransaction', new mongoose.Schema({}));
}
if (!mongoose.models.LabourContract) {
    mongoose.model('LabourContract', new mongoose.Schema({}));
}

// Mock loadSettings
const settingsMiddleware = require('./src/middlewares/settings');
settingsMiddleware.loadSettings = async () => {
    return {
        brickflow_app_language: 'en_us',
        currency_symbol: '₹',
        dateFormat: 'DD/MM/YYYY',
        company_name: 'Test Company'
    };
};

async function testLive() {
    console.log('Testing live PDF generation...');

    const mockResult = {
        _id: '6982fc3103c05a39e8f1da6e',
        number: 'TEST-001',
        date: new Date(),
        recipientType: 'Labour',
        amount: 50000,
        inWords: 'Fifty Thousand',
        description: 'Test Payment for Labour',
        paymentMode: 'Cash',
        items: []
    };

    try {
        console.log("Calling generatePdf...");
        const pdfBuffer = await custom.generatePdf(
            'ExpenseVoucher', // Use a simple template
            { filename: 'test', format: 'A5' },
            mockResult
        );

        const outputPath = path.resolve(__dirname, 'test_live_output.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('Success! Test PDF generated at:', outputPath);
        console.log('Buffer size:', pdfBuffer.length);
    } catch (err) {
        console.error('FAILED to generate PDF:', err);
    }
}

testLive();
