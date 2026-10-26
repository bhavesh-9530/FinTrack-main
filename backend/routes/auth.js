
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// @route   POST /api/auth/register
// @desc    Register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }

        // Create user
        const user = await User.create({ name, email, password });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, error: error.message || 'Registration failed' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                budget: user.budget
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

// // @route   GET /api/auth/me
// // @desc    Get current user
// router.get('/me', protect, async (req, res) => {
//     res.json({
//         success: true,
//         user: req.user
//     });
// });

// Add this to your auth.js routes

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                budget: req.user.budget,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
});

// @route   PUT /api/auth/budget
// @desc    Update user budget
router.put('/budget', protect, async (req, res) => {
    try {
        const { budget } = req.body;

        if (budget === undefined || budget < 0) {
            return res.status(400).json({ success: false, error: 'Please provide a valid budget amount' });
        }

        req.user.budget = budget;
        await req.user.save();

        res.json({
            success: true,
            message: 'Budget updated successfully',
            budget: req.user.budget
        });
    } catch (error) {
        console.error('Budget update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update budget' });
    }
});

module.exports = router;