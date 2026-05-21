const express = require('express');
const authMiddleware = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const router = express.Router();

// GET /api/transactions - Get all transactions for logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, startDate, endDate, limit = 50 } = req.query;
        
        let query = {
            $or: [
                { fromUser: req.userId },
                { toUser: req.userId }
            ]
        };

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const transactions = await Transaction.find(query)
            .populate('fromUser', 'name upiId')
            .populate('toUser', 'name upiId')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/transactions/:transactionId - Get single transaction
router.get('/:transactionId', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ 
            transactionId: req.params.transactionId 
        })
        .populate('fromUser', 'name upiId')
        .populate('toUser', 'name upiId');

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check if user is part of this transaction
        if (transaction.fromUser._id.toString() !== req.userId && 
            transaction.toUser._id.toString() !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;