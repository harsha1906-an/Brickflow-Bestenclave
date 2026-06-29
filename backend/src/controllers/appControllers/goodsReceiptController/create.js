const mongoose = require('mongoose');
const Model = mongoose.model('GoodsReceipt');
const PurchaseOrder = mongoose.model('PurchaseOrder');
const Material = mongoose.model('Material');
const InventoryTransaction = mongoose.model('InventoryTransaction');

const create = async (req, res) => {
    const { purchaseOrderId, items = [], notes, date } = req.body;
    const { _id: userId } = req.admin;

    if (!purchaseOrderId) {
        return res.status(400).json({ success: false, message: 'Purchase Order ID is required' });
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
        return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    if (po.status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Only Approved POs can be received' });
    }

    // 1. Create Goods Receipt
    // Generate a simple number (in real app, use a counter)
    const count = await Model.countDocuments({ removed: false });
    const number = `GRN-${new Date().getFullYear()}-${count + 1}`;

    const grnData = {
        number,
        date: date || new Date(),
        purchaseOrder: purchaseOrderId,
        items: items, // Expecting [{ itemName, quantityReceived }]
        notes,
        receivedBy: userId,
    };

    const grn = await new Model(grnData).save();

    // 2. Update Inventory
    for (const item of items) {
        // Try to find material by name
        // In a strict system, PO items would ID-link to Materials. Here we match by Name.
        const material = await Material.findOne({ name: item.itemName, removed: false });

        if (material) {
            // Update Stock
            material.currentStock = (material.currentStock || 0) + (Number(item.quantityReceived) || 0);
            await material.save();

            // Create Transaction Log
            await new InventoryTransaction({
                material: material._id,
                quantity: Number(item.quantityReceived),
                type: 'inward',
                reference: `Goods Receipt ${number}`,
                remainingQuantity: Number(item.quantityReceived),
                performedBy: userId,
                date: date || new Date(),
            }).save();
        }
        // If material not found, we just record the GRN but can't update stock of unknown item
    }

    return res.status(200).json({
        success: true,
        result: grn,
        message: 'Goods Receipt created and Inventory updated',
    });
};

module.exports = create;
