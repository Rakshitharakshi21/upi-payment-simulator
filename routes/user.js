const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const router = express.Router();

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-mpin -mpinAttempts -mpinLockUntil');
        const wallet = await Wallet.findOne({ userId: req.userId });

        res.json({
            user,
            wallet: {
                balance: wallet.balance
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;