const express = require('express');
const authMiddleware = require('../middleware/auth');
const Webhook = require('../models/Webhook');
const router = express.Router();

// GET /api/webhooks/transaction/:transactionId - Check webhook status for a transaction
router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
    try {
        const webhook = await Webhook.findOne({ 
            transactionId: req.params.transactionId 
        });
        
        if (!webhook) {
            return res.status(404).json({ error: 'Webhook not found for this transaction' });
        }
        
        res.json({
            success: true,
            webhook: {
                status: webhook.status,
                attempts: webhook.attempts,
                maxAttempts: webhook.maxAttempts,
                lastAttemptAt: webhook.lastAttemptAt,
                nextAttemptAt: webhook.nextAttemptAt,
                response: webhook.response,
                error: webhook.error,
                createdAt: webhook.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/webhooks/failed - Get all failed webhooks
router.get('/failed', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ status: 'FAILED' })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({
            success: true,
            count: webhooks.length,
            webhooks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/webhooks/pending - Get all pending webhooks (for monitoring)
router.get('/pending', authMiddleware, async (req, res) => {
    try {
        const webhooks = await Webhook.find({ status: 'PENDING' })
            .sort({ nextAttemptAt: 1 })
            .limit(50);
        
        res.json({
            success: true,
            count: webhooks.length,
            webhooks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;