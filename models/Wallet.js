const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 10000,  // ₹10,000 initial balance
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);