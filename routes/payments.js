const express = require('express');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const redisClient = require('../config/redis');
const router = express.Router();

// Generate unique transaction ID
function generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN${timestamp}${random}`.toUpperCase();
}

// POST /api/payments/pay
router.post('/pay', authMiddleware, async (req, res) => {
    try {
        const { toUpiId, amount, mpin, webhookUrl } = req.body;

        if (!toUpiId || !amount || !mpin) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (amount < 1) {
            return res.status(400).json({ error: 'Amount must be at least ₹1' });
        }

        // ============ RATE LIMITING ============
        const rateKey = `rate:${req.userId}`;
        const rateCount = await redisClient.get(rateKey);
        const currentRate = parseInt(rateCount) || 0;
        
        if (currentRate >= 5) {
            const ttl = await redisClient.ttl(rateKey);
            return res.status(429).json({ 
                error: `Rate limit: Max 5 payments/minute. Try again in ${ttl} seconds.` 
            });
        }
        
        await redisClient.incr(rateKey);
        if (currentRate === 0) {
            await redisClient.expire(rateKey, 60);
        }
        // ============ END RATE LIMITING ============

        const sender = await User.findById(req.userId);
        if (!sender) {
            return res.status(404).json({ error: 'Sender not found' });
        }

        // ============ MPIN LOCK CHECK ============
        const lockKey = `lock:${sender._id}`;
        const isLocked = await redisClient.get(lockKey);
        if (isLocked) {
            const ttl = await redisClient.ttl(lockKey);
            return res.status(401).json({ 
                error: `Account LOCKED for ${Math.ceil(ttl / 60)} minutes due to wrong MPIN attempts.` 
            });
        }
        // ============ END MPIN LOCK CHECK ============

        // Verify MPIN
        const isValidMpin = await bcrypt.compare(mpin, sender.mpin);
        
        if (!isValidMpin) {
            // ============ TRACK WRONG ATTEMPTS ============
            const attemptKey = `attempt:${sender._id}`;
            let attempts = await redisClient.get(attemptKey);
            let currentAttempts = parseInt(attempts) || 0;
            currentAttempts++;
            
            await redisClient.set(attemptKey, currentAttempts, 1800);
            
            const remaining = 3 - currentAttempts;
            
            if (currentAttempts >= 3) {
                await redisClient.set(lockKey, 'locked', 1800);
                await redisClient.del(attemptKey);
                return res.status(401).json({ 
                    error: 'Account LOCKED for 30 minutes! Too many wrong MPIN attempts.' 
                });
            }
            
            return res.status(401).json({ 
                error: `Wrong MPIN! ${remaining} attempt(s) remaining.` 
            });
        }
        
        // Reset attempts on successful login
        await redisClient.del(`attempt:${sender._id}`);
        // ============ END WRONG ATTEMPTS ============

        const receiver = await User.findOne({ upiId: toUpiId });
        if (!receiver) {
            return res.status(404).json({ error: 'Invalid UPI ID' });
        }

        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({ error: 'Cannot send to yourself' });
        }

        let senderWallet = await Wallet.findOne({ userId: sender._id });
        let receiverWallet = await Wallet.findOne({ userId: receiver._id });

        if (senderWallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        senderWallet = await Wallet.findOneAndUpdate(
            { userId: sender._id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { new: true }
        );

        if (!senderWallet) {
            return res.status(400).json({ error: 'Transfer failed' });
        }

        await Wallet.findOneAndUpdate(
            { userId: receiver._id },
            { $inc: { balance: amount } },
            { new: true }
        );

        const transactionId = generateTransactionId();
        const transaction = new Transaction({
            transactionId,
            fromUser: sender._id,
            toUser: receiver._id,
            fromUpiId: sender.upiId,
            toUpiId: receiver.upiId,
            amount,
            status: 'SUCCESS'
        });
        await transaction.save();

        // ============ TRIGGER WEBHOOK ============
        try {
            const merchantUrl = webhookUrl || 'https://webhook.site/5cf2b7d8-eb66-4882-aabc-6c8a3de445e1';
            const { triggerWebhook } = require('../services/webhookService');
            await triggerWebhook(transaction, merchantUrl);
            console.log('✅ Webhook triggered for:', transaction.transactionId);
        } catch (webhookErr) {
            console.error('❌ Webhook error:', webhookErr.message);
            // Don't fail the payment if webhook fails
        }
        // ============ END WEBHOOK ============

        res.json({
            success: true,
            transactionId: transaction.transactionId,
            amount: amount,
            from: sender.upiId,
            to: receiver.upiId,
            balance: senderWallet.balance,
            status: 'SUCCESS',
            timestamp: transaction.timestamp
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ userId: req.userId });
        const user = await User.findById(req.userId);
        
        res.json({
            upiId: user.upiId,
            balance: wallet.balance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;