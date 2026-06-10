const mongoose = require('mongoose');
const whatsappService = require('@/services/whatsappService');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Material');

methods.adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reference, vehicleNumber, notes, date, project, usageCategory, villa, supplier, issuedBy } = req.body; // type: 'inward' or 'outward', villa: villaId

        if (!['inward', 'outward'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction type' });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be positive' });
        }

        const Material = mongoose.model('Material');
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const VillaStock = mongoose.model('VillaStock');

        const material = await Material.findOne({ _id: id, removed: { $ne: true } });
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        let villaStock = null;
        if (villa) {
            villaStock = await VillaStock.findOne({ villa, material: id });
            if (!villaStock) {
                // Create if not exists (only strict checking for outward if needed, but here we can allow negative or require initial inward)
                // For now, create new with 0 if not exists
                villaStock = new VillaStock({ villa, material: id, currentStock: 0 });
            }
        }


        // Check stock for outward
        // If outward WITHOUT villa = consuming from Global, check global stock
        // If outward WITH villa = consuming from Villa, check villa stock (not global!)
        if (type === 'outward' && !villa && material.currentStock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient global stock. Current: ${material.currentStock} ${material.unit}`
            });
        }

        // Villa Stock check - enforce to prevent negative villa stock
        if (type === 'outward' && villa && villaStock) {
            if (villaStock.currentStock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock at Villa. Current: ${villaStock.currentStock} ${material.unit}`
                });
            }
        }



        const { calculate } = require('@/helpers');

        console.log('\n=== STOCK ADJUSTMENT DEBUG ===');
        console.log('Type:', type);
        console.log('Villa:', villa);
        console.log('Quantity:', quantity);
        console.log('Material current stock BEFORE:', material.currentStock);
        console.log('VillaStock exists:', !!villaStock);
        if (villaStock) {
            console.log('VillaStock current stock BEFORE:', villaStock.currentStock);
        }

        // Update Material Stock
        if (type === 'inward') {
            if (villaStock) {
                // TRANSFER: Global -> Villa
                console.log('>>> TRANSFER MODE: Global -> Villa');
                // Check if Global has enough stock
                if (material.currentStock < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient global stock for transfer. Current: ${material.currentStock} ${material.unit}`
                    });
                }
                const oldGlobalStock = material.currentStock;
                const oldVillaStock = villaStock.currentStock;

                material.currentStock = calculate.sub(material.currentStock, quantity); // Reduce Global
                villaStock.currentStock = calculate.add(villaStock.currentStock, quantity); // Increase Villa
                villaStock.lastUpdated = Date.now();

                console.log(`Global stock: ${oldGlobalStock} -> ${material.currentStock} (reduced by ${quantity})`);
                console.log(`Villa stock: ${oldVillaStock} -> ${villaStock.currentStock} (increased by ${quantity})`);

                await villaStock.save();
                console.log('✓ VillaStock saved');
            } else {
                // PURCHASE: External -> Global
                console.log('>>> PURCHASE MODE: External -> Global');
                material.currentStock = calculate.add(material.currentStock, quantity);
                console.log(`Global stock increased: ${material.currentStock}`);
            }
        } else {
            // OUTWARD (Consumption)
            if (villaStock) {
                // Consume from Villa
                console.log('>>> CONSUMPTION MODE: Villa stock');
                villaStock.currentStock = calculate.sub(villaStock.currentStock, quantity);
                villaStock.lastUpdated = Date.now();
                await villaStock.save();
                console.log(`Villa stock reduced: ${villaStock.currentStock}`);
                // Do NOT reduce Global (Material.currentStock) because it was already reduced during Transfer
            } else {
                // Consume from Global directly
                console.log('>>> CONSUMPTION MODE: Global stock');
                material.currentStock = calculate.sub(material.currentStock, quantity);
                console.log(`Global stock reduced: ${material.currentStock}`);
            }
        }

        console.log('Material current stock AFTER adjustment:', material.currentStock);
        console.log('Saving material...');
        await material.save();
        console.log('✓ Material saved');

        // WhatsApp Low Stock Notification
        if (material.reorderLevel > 0 && material.currentStock <= material.reorderLevel) {
          const Admin = mongoose.model('Admin');
          try {
            const admins = await Admin.find({
              removed: false,
              role: { $in: ['owner', 'manager'] },
            });

            for (const admin of admins) {
              if (admin.phone) {
                await whatsappService.sendTemplate(admin.phone, 'low_stock_alert', 'en_US', [
                  { type: 'text', text: material.name },
                  {
                    type: 'text',
                    text: material.currentStock.toString() + ' ' + material.unit,
                  },
                ]);
              }
            }
          } catch (e) {
            console.error('WhatsApp Stock Alert Error:', e);
          }
        }

        console.log('=== END STOCK ADJUSTMENT ===\n');

        // Auto-fetch cost when transferring to villa
        let ratePerUnit = req.body.ratePerUnit || 0;
        let totalCost = req.body.totalCost || 0;
        let remainingQuantityForBatch = 0; // For tracking this specific transaction's remaining stock

        // --- FIFO LOGIC START ---

        // Scenario 1: GLOBAL INWARD (Purchase)
        // We initialize the remainingQuantity so this batch can be consumed later.
        if (type === 'inward' && !villa) {
            remainingQuantityForBatch = quantity;
        }

        // Scenario 2: CONSUMPTION FROM GLOBAL STOCK (Transfer to Villa OR Outward from Global)
        // We need to calculate cost by consuming 'inward' global batches FIFO.
        // Condition: It's an issue (outward without villa) OR a transfer (inward with villa)
        const isConsumingGlobal = (type === 'outward' && !villa) || (type === 'inward' && villa);

        if (isConsumingGlobal) {
            console.log('>>> FIFO: Calculating Cost for Global Consumption...');
            let pendingQty = quantity;
            let calculatedCost = 0;
            let consumedBatches = [];

            // Find available batches (FIFO: Oldest First)
            const batches = await InventoryTransaction.find({
                material: id,
                type: 'inward',
                villa: { $exists: false }, // Global stock only
                remainingQuantity: { $gt: 0 }
            }).sort({ date: 1, created: 1 });

            let lastRate = 0;

            for (const batch of batches) {
                if (pendingQty <= 0) break;

                const consumeAmount = Math.min(pendingQty, batch.remainingQuantity);
                const batchCost = calculate.multiply(consumeAmount, batch.ratePerUnit);

                calculatedCost = calculate.add(calculatedCost, batchCost);
                pendingQty = calculate.sub(pendingQty, consumeAmount);

                // Track updates (don't save yet until we are sure)
                batch.remainingQuantity = calculate.sub(batch.remainingQuantity, consumeAmount);
                consumedBatches.push(batch);
                lastRate = batch.ratePerUnit;

                console.log(`  - Consumed ${consumeAmount} from batch ${batch._id} @ ${batch.ratePerUnit}`);
            }

            // Fallback for Ghost Stock (if we ran out of batches but still have quantity to issue)
            if (pendingQty > 0) {
                console.warn(`  ⚠ FIFO WARNING: insufficient tracked batches! Using last rate ${lastRate} for remaining ${pendingQty}`);
                const estCost = calculate.multiply(pendingQty, lastRate);
                calculatedCost = calculate.add(calculatedCost, estCost);
            }

            totalCost = calculatedCost;
            // Weighted average rate for this specific transaction record
            ratePerUnit = totalCost / quantity;

            console.log(`>>> FIFO Result: Total Cost ${totalCost}, Avg Rate ${ratePerUnit}`);

            // Commit the batch updates
            for (const batch of consumedBatches) {
                await batch.save();
            }
        }
        // --- FIFO LOGIC END ---

        // Legacy/Fallback: If transferring to villa (inward with villa) and FIFO didn't run (e.g. logic disabled or skipped), fetch latest cost
        // (Note: The FIFO block above covers this, but we keep this as a safe else if for some reason FIFO failed or wasn't triggered correctly)
        if (type === 'inward' && villa && totalCost === 0 && quantity > 0 && !req.body.totalCost) {
            // This block is now largely redundant due to FIFO logic covering "inward && villa", 
            // but we leave it inactive or as a backup if needed. 
            // For now, FIFO logic takes precedence.
        }

        // Create Transaction Record
        await new InventoryTransaction({
            material: id,
            type,
            quantity: calculate.add(0, quantity), // ensure number
            remainingQuantity: remainingQuantityForBatch,
            ratePerUnit,
            totalCost,
            date: date || new Date(),
            reference,
            vehicleNumber,
            notes,
            project,
            villa,
            supplier,
            issuedBy,
            usageCategory: usageCategory || 'daily_work',
            performedBy: req.admin._id,
        }).save();

        return res.status(200).json({
            success: true,
            result: material,
            message: 'Stock adjusted successfully',
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

methods.history = async (req, res) => {
    try {
        const { id } = req.params;
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const Expense = mongoose.model('Expense');

        const history = await InventoryTransaction.find({ material: id, removed: { $ne: true } })
            .sort({ date: -1, created: -1 })
            .limit(50); // Limit to last 50 transactions for performance

        // Query Expense model to find which transactions have recorded payments
        const transactionIds = history.map(t => t._id);
        const paidExpenses = await Expense.find({
            removed: { $ne: true },
            'supplierPayments.inventoryTransaction': { $in: transactionIds }
        });

        const paidTransactionIds = new Set();
        paidExpenses.forEach(exp => {
            exp.supplierPayments.forEach(sp => {
                if (sp.inventoryTransaction) {
                    paidTransactionIds.add(sp.inventoryTransaction.toString());
                }
            });
        });

        const historyWithPaymentStatus = history.map(t => {
            const obj = t.toObject();
            obj.hasPayment = paidTransactionIds.has(t._id.toString());
            return obj;
        });

        return res.status(200).json({
            success: true,
            result: historyWithPaymentStatus
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

methods.recentTransactions = async (req, res) => {
    try {
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const { limit = 10 } = req.query;

        const transactions = await InventoryTransaction.find({ removed: { $ne: true } })
            .sort({ date: -1, created: -1 })
            .limit(parseInt(limit))
            .populate('material')
            .populate('villa')
            .populate('project');

        return res.status(200).json({
            success: true,
            result: transactions
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

methods.downloadReport = async (req, res) => {
    try {
        console.log("Download Report Request Received", req.query);
        const { startDate, endDate, villa } = req.query;
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const Villa = mongoose.model('Villa');
        const pdfController = require('@/controllers/pdfController');

        console.log("Download Param - Start:", startDate, "End:", endDate, "Villa:", villa);

        const query = {
            removed: { $ne: true },
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        if (villa && villa !== 'all') {
            query.villa = villa;
        }

        console.log("Fetching transactions with query:", query);
        const transactions = await InventoryTransaction.find(query)
            .populate('material')
            .populate('villa')
            .sort({ date: 1 });

        console.log("Found transactions:", transactions.length);

        const villaObj = (villa && villa !== 'all') ? await Villa.findById(villa) : null;

        const model = {
            startDate,
            endDate,
            villa: villaObj,
            items: transactions
        };

        // const filename = `InventoryReport_${Date.now()}.pdf`;
        // const targetLocation = `src/public/download/${filename}`;

        console.log("Generating PDF Buffer...");
        const pdfBuffer = await pdfController.generatePdf(
            'InventoryReport',
            { filename: `InventoryReport_${Date.now()}.pdf`, format: 'A4' }, // targetLocation removed
            model
        );

        console.log("PDF Generated successfully. Sending file...");
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="InventoryReport_${Date.now()}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });

        return res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error("Download Report Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

methods.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params; // ID of the transaction to delete/undo
        const InventoryTransaction = mongoose.model('InventoryTransaction');
        const Material = mongoose.model('Material');
        const VillaStock = mongoose.model('VillaStock');
        const { calculate } = require('@/helpers');

        console.log(`\n=== UNDO TRANSACTION START: ${id} ===`);

        const transaction = await InventoryTransaction.findOne({ _id: id, removed: { $ne: true } });
        if (!transaction) {
            console.error('Transaction not found or already removed');
            return res.status(404).json({ success: false, message: 'Stock entry not found or already removed' });
        }

        // Check if payment has been made for this transaction
        const Expense = mongoose.model('Expense');
        const linkedPayment = await Expense.findOne({
            removed: { $ne: true },
            'supplierPayments.inventoryTransaction': id
        });
        if (linkedPayment) {
            console.error(`Cannot delete transaction: a payment has already been recorded for this stock (Expense: ${linkedPayment._id})`);
            return res.status(400).json({
                success: false,
                message: 'This stock entry cannot be deleted because payment has already been completed.'
            });
        }

        const material = await Material.findOne({ _id: transaction.material, removed: { $ne: true } });
        if (!material) {
            console.error('Material associated with transaction not found');
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        const { type, quantity, villa } = transaction;

        // Undo Stock Updates
        if (type === 'inward') {
            if (villa) {
                // Was TRANSFER: Global -> Villa
                // Undo: VillaStock -= quantity, Global += quantity
                const villaStock = await VillaStock.findOne({ villa, material: transaction.material });
                if (villaStock) {
                    if (villaStock.currentStock < quantity) {
                        return res.status(400).json({
                            success: false,
                            message: 'Cannot undo this transfer because some of these materials have already been used at the Villa.'
                        });
                    }
                    const oldVillaStock = villaStock.currentStock;
                    villaStock.currentStock = calculate.sub(villaStock.currentStock, quantity);
                    villaStock.lastUpdated = Date.now();
                    await villaStock.save();
                    console.log(`Villa Stock undone: ${oldVillaStock} -> ${villaStock.currentStock}`);
                }

                // Return quantity to Global stock
                const oldGlobalStock = material.currentStock;
                material.currentStock = calculate.add(material.currentStock, quantity);
                console.log(`Global Stock restored: ${oldGlobalStock} -> ${material.currentStock}`);

                // Restore FIFO batch remainingQuantity (since this consumption from Global is undone)
                let pendingRestore = quantity;
                const batchesToRestore = await InventoryTransaction.find({
                    material: transaction.material,
                    type: 'inward',
                    villa: { $exists: false },
                    removed: { $ne: true }
                }).sort({ date: -1, created: -1 });

                for (const batch of batchesToRestore) {
                    if (pendingRestore <= 0) break;
                    const space = calculate.sub(batch.quantity, batch.remainingQuantity);
                    if (space > 0) {
                        const restoreAmt = Math.min(pendingRestore, space);
                        batch.remainingQuantity = calculate.add(batch.remainingQuantity, restoreAmt);
                        pendingRestore = calculate.sub(pendingRestore, restoreAmt);
                        await batch.save();
                        console.log(`  - Restored ${restoreAmt} back to batch ${batch._id}`);
                    }
                }

            } else {
                // Was PURCHASE: External -> Global
                // Undo: Global -= quantity
                if (material.currentStock < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot undo this purchase because some of these materials have already been used or transferred.'
                    });
                }

                // Safety Check: Verify this specific purchase batch hasn't already been consumed by other transactions
                if (transaction.remainingQuantity < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot delete this purchase entry because some or all of these materials have already been used or transferred.'
                    });
                }

                const oldGlobalStock = material.currentStock;
                material.currentStock = calculate.sub(material.currentStock, quantity);
                console.log(`Global Stock undone: ${oldGlobalStock} -> ${material.currentStock}`);
            }
        } else if (type === 'outward') {
            if (villa) {
                // Was CONSUMPTION from Villa
                // Undo: VillaStock += quantity
                let villaStock = await VillaStock.findOne({ villa, material: transaction.material });
                if (!villaStock) {
                    villaStock = new VillaStock({ villa, material: transaction.material, currentStock: 0 });
                }
                const oldVillaStock = villaStock.currentStock;
                villaStock.currentStock = calculate.add(villaStock.currentStock, quantity);
                villaStock.lastUpdated = Date.now();
                await villaStock.save();
                console.log(`Villa Stock restored: ${oldVillaStock} -> ${villaStock.currentStock}`);
            } else {
                // Was CONSUMPTION from Global
                // Undo: Global += quantity
                const oldGlobalStock = material.currentStock;
                material.currentStock = calculate.add(material.currentStock, quantity);
                console.log(`Global Stock restored: ${oldGlobalStock} -> ${material.currentStock}`);

                // Restore FIFO batch remainingQuantity
                let pendingRestore = quantity;
                const batchesToRestore = await InventoryTransaction.find({
                    material: transaction.material,
                    type: 'inward',
                    villa: { $exists: false },
                    removed: { $ne: true }
                }).sort({ date: -1, created: -1 });

                for (const batch of batchesToRestore) {
                    if (pendingRestore <= 0) break;
                    const space = calculate.sub(batch.quantity, batch.remainingQuantity);
                    if (space > 0) {
                        const restoreAmt = Math.min(pendingRestore, space);
                        batch.remainingQuantity = calculate.add(batch.remainingQuantity, restoreAmt);
                        pendingRestore = calculate.sub(pendingRestore, restoreAmt);
                        await batch.save();
                        console.log(`  - Restored ${restoreAmt} back to batch ${batch._id}`);
                    }
                }
            }
        }

        // Save material stock level changes
        await material.save();
        console.log('✓ Material stock saved');

        // Soft delete the transaction
        transaction.removed = true;
        await transaction.save();
        console.log('✓ Transaction soft-deleted');

        console.log(`=== UNDO TRANSACTION SUCCESS ===\n`);

        return res.status(200).json({
            success: true,
            result: material,
            message: 'Transaction undone and deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteTransaction:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the stock entry.'
        });
    }
};

module.exports = methods;
