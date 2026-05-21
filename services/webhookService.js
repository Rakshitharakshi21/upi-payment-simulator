const Webhook = require('../models/Webhook');

// Send webhook to merchant
async function sendWebhook(webhookId) {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) return;
    
    webhook.attempts += 1;
    webhook.lastAttemptAt = new Date();
    
    try {
        const response = await fetch(webhook.merchantUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': generateSignature(webhook.payload)
            },
            body: JSON.stringify(webhook.payload)
        });
        
        webhook.response = {
            statusCode: response.status,
            body: await response.text()
        };
        
        if (response.ok) {
            webhook.status = 'SUCCESS';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
        await webhook.save();
        console.log(`✅ Webhook sent: ${webhook.transactionId} -> ${webhook.merchantUrl}`);
        
    } catch (error) {
        webhook.error = error.message;
        
        if (webhook.attempts < webhook.maxAttempts) {
            // Schedule retry
            const delays = [5000, 10000, 30000]; // 5s, 10s, 30s
            const delay = delays[webhook.attempts - 1];
            webhook.nextAttemptAt = new Date(Date.now() + delay);
            webhook.status = 'PENDING';
            
            await webhook.save();
            
            // Schedule retry
            setTimeout(() => sendWebhook(webhookId), delay);
            console.log(`🔄 Webhook retry scheduled: ${webhook.transactionId} (attempt ${webhook.attempts + 1}/${webhook.maxAttempts})`);
        } else {
            webhook.status = 'FAILED';
            await webhook.save();
            console.log(`❌ Webhook failed after ${webhook.maxAttempts} attempts: ${webhook.transactionId}`);
        }
    }
}

// Generate simple signature (for verification)
function generateSignature(payload) {
    const crypto = require('crypto');
    const data = JSON.stringify(payload);
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Create and send webhook for a transaction
async function triggerWebhook(transaction, merchantUrl) {
    const payload = {
        event: 'payment.success',
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        fromUpiId: transaction.fromUpiId,
        toUpiId: transaction.toUpiId,
        timestamp: transaction.timestamp,
        status: transaction.status
    };
    
    const webhook = new Webhook({
        transactionId: transaction.transactionId,
        merchantUrl,
        payload,
        nextAttemptAt: new Date()
    });
    
    await webhook.save();
    
    // Send immediately
    setTimeout(() => sendWebhook(webhook._id), 100);
    
    return webhook;
}

// Get webhook status for a transaction
async function getWebhookStatus(transactionId) {
    return await Webhook.findOne({ transactionId });
}

module.exports = { triggerWebhook, getWebhookStatus };