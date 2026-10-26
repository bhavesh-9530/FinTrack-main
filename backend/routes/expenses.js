
const express = require('express');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const router = express.Router();

// @route   GET /api/expenses
// @desc    Get all expenses for logged in user
router.get('/', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user._id })
            .sort({ date: -1 }); // Most recent first
        
        // Calculate total spent
        const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Calculate monthly spending (current month)
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthlyExpenses = expenses.filter(exp => new Date(exp.date) >= startOfMonth);
        const monthlySpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        res.json({
            success: true,
            count: expenses.length,
            totalSpent,
            monthlySpent,
            budget: req.user.budget,
            remainingBudget: req.user.budget - monthlySpent,
            expenses
        });
    } catch (error) {
        console.error('Fetch expenses error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch expenses' });
    }
});

// @route   POST /api/expenses
// @desc    Add new expense
router.post('/', protect, async (req, res) => {
    try {
        const { amount, category, description, date } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Please provide a valid amount' });
        }

        // Get current month's expenses
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const monthlyExpenses = await Expense.find({
            userId: req.user._id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const monthlySpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Check budget limit
        if (req.user.budget > 0 && monthlySpent + amount > req.user.budget) {
            return res.status(400).json({
                success: false,
                error: 'Budget limit exceeded!',
                monthlySpent,
                budget: req.user.budget,
                remaining: req.user.budget - monthlySpent
            });
        }

        // Create expense
        const expense = await Expense.create({
            userId: req.user._id,
            amount,
            category,
            description: description || '',
            date: date || Date.now()
        });

        res.status(201).json({
            success: true,
            message: 'Expense added successfully',
            expense
        });
    } catch (error) {
        console.error('Add expense error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to add expense' });
    }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
router.delete('/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });

        if (!expense) {
            return res.status(404).json({ success: false, error: 'Expense not found' });
        }

        await expense.deleteOne();

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete expense' });
    }
});

// @route   GET /api/expenses/summary
// @desc    Get expense summary by category
router.get('/summary', protect, async (req, res) => {
    try {
        const summary = await Expense.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({
            success: true,
            summary
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ success: false, error: 'Failed to get summary' });
    }
});

module.exports = router;