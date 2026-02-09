const puppeteer = require('puppeteer');
const fs = require('fs');

async function runTest() {
    console.log('Launching Puppeteer...');
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        console.log('Browser launched successfully!');

        const page = await browser.newPage();
        await page.setContent('<h1>Hello from Puppeteer</h1><p>If you see this, PDF generation works.</p>');
        console.log('Page content set.');

        const pdfBuffer = await page.pdf({ format: 'A4' });
        console.log('PDF generated! Buffer size:', pdfBuffer.length);

        fs.writeFileSync('test_isolated.pdf', pdfBuffer);
        console.log('PDF saved to test_isolated.pdf');

        await browser.close();
        console.log('Browser closed. Test PASSED.');
    } catch (err) {
        console.error('Test FAILED with error:');
        console.error(err);
    }
}

runTest();
