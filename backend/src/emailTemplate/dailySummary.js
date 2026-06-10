exports.dailySummary = ({
    income = 0,
    expenses = 0,
    breakdown,
    bookings = [],
    inventoryLogs = [],
    date = new Date().toLocaleDateString(),
}) => {
    return `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Daily Summary - ${date}</h2>
        
        <div style="margin-bottom: 25px;">
            <h3 style="color: #2980b9;">💰 Financial Overview</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Official Income:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #27ae60;">₹${(breakdown?.officialIncome || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Internal Income (Cash):</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #f39c12;">₹${(breakdown?.internalIncome || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; background-color: #f9f9f9;"><strong>Total Today's Income:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #2ecc71; font-weight: bold; background-color: #f9f9f9;">₹${income.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Expenses:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: #e74c3c;">₹${expenses.toLocaleString()}</td>
                </tr>
                <!-- Expense Breakdown -->
                ${breakdown ? `
                <tr style="font-size: 13px; color: #7f8c8d;">
                    <td style="padding: 4px 8px 4px 24px; border-bottom: 1px solid #f9f9f9;">- Petty Cash:</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #f9f9f9; text-align: right;">₹${breakdown.pettyCash.toLocaleString()}</td>
                </tr>
                <tr style="font-size: 13px; color: #7f8c8d;">
                    <td style="padding: 4px 8px 4px 24px; border-bottom: 1px solid #f9f9f9;">- Supplier Payments:</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #f9f9f9; text-align: right;">₹${breakdown.supplier.toLocaleString()}</td>
                </tr>
                <tr style="font-size: 13px; color: #7f8c8d;">
                    <td style="padding: 4px 8px 4px 24px; border-bottom: 1px solid #f9f9f9;">- Labour Payments:</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #f9f9f9; text-align: right;">₹${breakdown.labour.toLocaleString()}</td>
                </tr>
                <tr style="font-size: 13px; color: #7f8c8d;">
                    <td style="padding: 4px 8px 4px 24px; border-bottom: 1px solid #f9f9f9;">- Other Expenses:</td>
                    <td style="padding: 4px 8px; border-bottom: 1px solid #f9f9f9; text-align: right;">₹${breakdown.other.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;"><strong>Closing Balance Today:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; font-size: 1.1em;">₹${(income - expenses).toLocaleString()}</td>
                </tr>
            </table>
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #2980b9;">📑 New Bookings (${bookings.length})</h3>
            ${bookings.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Client</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Villa</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(b => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${b.client?.name || 'N/A'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd;">${b.villa?.villaNumber || 'N/A'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${b.totalAmount.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: #7f8c8d;">No new bookings today.</p>'}
        </div>

        <div style="margin-bottom: 25px;">
            <h3 style="color: #2980b9;">📦 Inventory Logs (${inventoryLogs.length})</h3>
            ${inventoryLogs.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Material</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Type</th>
                            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventoryLogs.map(log => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #ddd;">${log.material?.name || 'N/A'}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-transform: capitalize;">${log.type}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${log.quantity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: #7f8c8d;">No inventory movements today.</p>'}
        </div>

        <p style="font-size: 12px; color: #95a5a6; border-top: 1px solid #eee; padding-top: 10px; margin-top: 30px;">
            This is an automated summary generated by BrickFlow.
        </p>
    </div>
    `;
};
