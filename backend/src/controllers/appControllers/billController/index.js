const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to make POST request using native Node.js https module (0 dependencies)
const postRequest = (url, body) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const postData = JSON.stringify(body);

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => {
                rawData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(rawData);
                    resolve({
                        status: res.statusCode,
                        data: parsed
                    });
                } catch (e) {
                    reject(new Error(`Failed to parse JSON response: ${rawData}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
};

const methods = {};

methods.scanBill = async (req, res) => {
    try {
        if (!req.upload || !req.upload.filePath) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded or file upload failed.'
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: 'Gemini API key is not configured.'
            });
        }

        const absolutePath = path.resolve(__dirname, '../../../', req.upload.filePath);
        
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({
                success: false,
                message: 'Uploaded file not found on disk.'
            });
        }

        // Read file and convert to base64
        const fileBuffer = fs.readFileSync(absolutePath);
        const base64Data = fileBuffer.toString('base64');

        // Determine mime type
        const ext = path.extname(req.upload.fileName).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') {
            mimeType = 'image/png';
        } else if (ext === '.pdf') {
            mimeType = 'application/pdf';
        } else if (ext === '.webp') {
            mimeType = 'image/webp';
        }

        console.log(`Sending image (${mimeType}) to Gemini API for parsing...`);

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: "Analyze this invoice/bill/receipt image. Extract the following fields as a structured JSON object: supplierName, invoiceNumber, date (format YYYY-MM-DD), totalAmount, taxAmount (GST), and items (an array of objects containing name, quantity, unit, rate, total). Match or guess these values accurately based on the text in the bill. If a value is missing, return null or empty array. Output only valid JSON matching the schema."
                        },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        supplierName: { type: "STRING" },
                        invoiceNumber: { type: "STRING" },
                        date: { type: "STRING" },
                        totalAmount: { type: "NUMBER" },
                        taxAmount: { type: "NUMBER" },
                        items: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    name: { type: "STRING" },
                                    quantity: { type: "NUMBER" },
                                    unit: { type: "STRING" },
                                    rate: { type: "NUMBER" },
                                    total: { type: "NUMBER" }
                                },
                                required: ["name", "quantity", "rate", "total"]
                            }
                        }
                    },
                    required: ["supplierName", "totalAmount"]
                }
            }
        };

        let geminiResponse;
        try {
            // Attempt with gemini-2.5-flash
            console.log("Attempting Gemini 2.5 Flash...");
            geminiResponse = await postRequest(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
                requestBody
            );
        } catch (e25) {
            console.log("Gemini 2.5 Flash failed or not found, falling back to gemini-2.0-flash...", e25.message);
            try {
                geminiResponse = await postRequest(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                    requestBody
                );
            } catch (e20) {
                console.log("Gemini 2.0 Flash failed, falling back to gemini-1.5-flash...", e20.message);
                geminiResponse = await postRequest(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    requestBody
                );
            }
        }

        const candidate = geminiResponse.data?.candidates?.[0];
        const textResponse = candidate?.content?.parts?.[0]?.text;

        if (!textResponse) {
            return res.status(500).json({
                success: false,
                message: 'No response text received from Gemini.'
            });
        }

        console.log("Raw Gemini Response received:", textResponse);
        const parsedData = JSON.parse(textResponse.trim());

        return res.status(200).json({
            success: true,
            result: parsedData,
            filePath: req.upload.filePath
        });

    } catch (error) {
        console.error('Error during bill scanning:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to process and scan the bill.',
            error: error.message
        });
    }
};

module.exports = methods;
