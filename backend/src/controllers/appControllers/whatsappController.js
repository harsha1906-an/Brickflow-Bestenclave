const whatsappService = require('@/utils/whatsappService');

exports.getStatus = async (req, res) => {
    const status = whatsappService.getStatus();
    return res.status(200).json({
        success: true,
        result: status,
        message: 'WhatsApp status fetched successfully',
    });
};

exports.reset = async (req, res) => {
    await whatsappService.resetConnection();
    return res.status(200).json({
        success: true,
        message: 'WhatsApp connection reset triggered',
    });
};

exports.send = async (req, res) => {
    const { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'Phone and message are required fields',
        });
    }
    
    try {
        await whatsappService.sendMessage(phone, message);
        return res.status(200).json({
            success: true,
            message: 'WhatsApp message sent successfully',
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || 'Failed to send WhatsApp message',
        });
    }
};
