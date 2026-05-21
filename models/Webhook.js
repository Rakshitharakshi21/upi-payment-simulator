const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        ref: 'Transaction'
    },
    merchantUrl: {
        type: String,
        required: true
    },
    payload: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING'
    },
    attempts: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    lastAttemptAt: {
        type: Date
    },
    nextAttemptAt: {
        type: Date
    },
    response: {
        statusCode: Number,
        body: String
    },
    error: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Webhook', webhookSchema);