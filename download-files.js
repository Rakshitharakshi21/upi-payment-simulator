const fs = require('fs');

// Create correct User.js
const userModel = `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: String,
    upiId: String,
    mpin: String,
    mpinAttempts: { type: Number, default: 0 },
    mpinLockUntil: { type: Date, default: null }
});

module.exports = mongoose.model('User', userSchema);
`;

// Create correct auth.js
const authRoutes = `const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const router = express.Router();

const JWT_SECRET = 'your_super_secret_key_change_this_later';

router.post('/register', async (req, res) => {
    try {
        const { name, email, mobile, mpin } = req.body;

        const existingUser = await User.findOne({ \$or: [{ email }, { mobile }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const baseName = name.toLowerCase().replace(/\\s/g, '');
        const randomNum = Math.floor(Math.random() * 1000);
        const upiId = \`\${baseName}\${randomNum}@upi\`;

        const hashedMpin = await bcrypt.hash(mpin, 10);

        const user = new User({ name, email, mobile, upiId, mpin: hashedMpin });
        await user.save();

        const wallet = new Wallet({ userId: user._id, balance: 10000 });
        await wallet.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, name, email, mobile, upiId },
            wallet: { balance: wallet.balance }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { upiId, mpin } = req.body;

        const user = await User.findOne({ upiId });
        if (!user) {
            return res.status(401).json({ error: 'Invalid UPI ID or MPIN' });
        }

        if (user.mpinLockUntil && user.mpinLockUntil > new Date()) {
            return res.status(401).json({ error: 'Account locked' });
        }

        const isValid = await bcrypt.compare(mpin, user.mpin);
        if (!isValid) {
            user.mpinAttempts += 1;
            if (user.mpinAttempts >= 3) {
                user.mpinLockUntil = new Date(Date.now() + 30 * 60000);
            }
            await user.save();
            return res.status(401).json({ error: 'Invalid UPI ID or MPIN' });
        }

        user.mpinAttempts = 0;
        user.mpinLockUntil = null;
        await user.save();

        const wallet = await Wallet.findOne({ userId: user._id });
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, mobile: user.mobile, upiId: user.upiId },
            wallet: { balance: wallet.balance }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
`;

// Write files
fs.writeFileSync('./models/User.js', userModel);
fs.writeFileSync('./routes/auth.js', authRoutes);

console.log('Files updated successfully!');
console.log('Now press Ctrl+C and restart server with: npm run dev');