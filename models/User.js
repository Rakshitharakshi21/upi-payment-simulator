const mongoose = require('mongoose');

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