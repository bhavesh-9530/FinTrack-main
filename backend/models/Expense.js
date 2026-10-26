
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Please provide an amount'],
        min: [0.01, 'Amount must be greater than 0']
    },
    category: {
        type: String,
        required: [true, 'Please select a category'],
        enum: ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Education', 'Others']
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    date: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
expenseSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);

