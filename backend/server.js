const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Audition = require('./models/Audition');
const Submission = require('./models/Submission');
const Notification = require('./models/Notification');
const auth = require('./middleware/auth');

dotenv.config();

// Validate environment variables
const requiredEnv = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
    console.error(`Missing environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
}
console.log('Environment variables loaded successfully');

// Modern MongoDB connection without deprecated options
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Timeout for server selection (30 seconds)
    connectTimeoutMS: 30000,         // Timeout for initial connection (30 seconds)
    autoIndex: true,                 // Automatically create indexes
}).catch((err) => {
    console.error('Initial MongoDB connection error:', err.message, '\nStack:', err.stack);
    process.exit(1);
});

// Event listeners for connection status
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - Body:`, req.body);
    next();
});

// Add GET routes to handle "Cannot GET" errors
app.get('/api/register', (req, res) => {
    res.status(405).json({ message: 'Method Not Allowed: Use POST to register a user' });
});

app.get('/api/login', (req, res) => {
    res.status(405).json({ message: 'Method Not Allowed: Use POST to login' });
});

// User Registration
app.post('/api/register', async (req, res) => {
    console.log('Register attempt - Body:', req.body);
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || typeof password !== 'string') {
        return res.status(400).json({ message: 'Username, email, and a valid password are required' });
    }

    try {
        console.log(`Checking for existing user with email: ${email}`);
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'Email already exists' });

        console.log(`Checking for existing user with username: ${username}`);
        user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: 'Username already exists' });

        console.log('Hashing password...');
        user = new User({
            username,
            email,
            password: await bcrypt.hash(password, 10),
            role: role || 'user',
            bookmarks: [],
        });

        console.log('Saving user to database...');
        await user.save();
        console.log('User saved successfully:', user);

        console.log('Generating JWT token...');
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, email: user.email, role: user.role, username: user.username, bookmarks: user.bookmarks } });
    } catch (err) {
        console.error('Error registering user:', err.message, '\nStack:', err.stack);
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue)[0];
            res.status(400).json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
        } else {
            res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
        }
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    console.log('Login attempt - Body:', req.body);
    const { email, password } = req.body;
    if (!email || !password || typeof password !== 'string') {
        return res.status(400).json({ message: 'Email and a valid password are required' });
    }

    try {
        console.log(`Finding user with email: ${email}`);
        const user = await User.findOne({ email });
        console.log('Found user:', user);
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        console.log('Comparing passwords...');
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        console.log('Generating JWT token...');
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user._id, email: user.email, role: user.role, username: user.username, bookmarks: user.bookmarks } });
    } catch (err) {
        console.error('Error logging in:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Get all auditions (no auth required)
app.get('/api/auditions', async (req, res) => {
    try {
        const auditions = await Audition.find()
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        
        const auditionsWithSubmissions = await Promise.all(auditions.map(async (audition) => {
            const submissions = await Submission.find({ audition: audition._id })
                .populate('user', 'email username');
            return { ...audition.toObject(), submissions };
        }));

        console.log('Fetched auditions:', auditionsWithSubmissions);
        res.json(auditionsWithSubmissions);
    } catch (err) {
        console.error('Error fetching auditions:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Failed to load auditions. Please try again later.', error: err.message, stack: err.stack });
    }
});

// Get recommended auditions (for users only)
app.get('/api/auditions/recommendations', auth, async (req, res) => {
    try {
        if (req.user.role !== 'user') {
            return res.status(403).json({ message: 'Only users can access recommendations' });
        }
        const auditions = await Audition.find()
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        
        const auditionsWithSubmissions = await Promise.all(auditions.map(async (audition) => {
            const submissions = await Submission.find({ audition: audition._id })
                .populate('user', 'email username');
            return { ...audition.toObject(), submissions };
        }));

        res.json(auditionsWithSubmissions);
    } catch (err) {
        console.error('Error fetching recommendations:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Failed to load recommendations. Please try again later.', error: err.message, stack: err.stack });
    }
});

// Post a new audition (protected route, only for organizers)
app.post('/api/auditions', auth, async (req, res) => {
    if (req.user.role !== 'organizer') {
        return res.status(403).json({ message: 'Only organizers can post auditions' });
    }

    const { title, description, date, location, criteriaWeights } = req.body;
    if (!title || !description || !date || !location?.name) {
        return res.status(400).json({ message: 'All fields (title, description, date, location.name) are required' });
    }

    try {
        const newAudition = new Audition({
            title,
            description,
            date,
            location,
            createdBy: req.user.id,
            likes: [],
            comments: [],
            submissionCount: 0,
            criteriaWeights: criteriaWeights || {
                relevance: 0.4,
                sentiment: 0.2,
                skills: 0.2,
                video: 0.2,
            },
        });

        const savedAudition = await newAudition.save();

        const users = await User.find();
        const notifications = users.map(user => ({
            user: user._id,
            message: `New audition posted: ${title}`,
            type: 'new_audition',
        }));
        await Notification.insertMany(notifications);

        const populatedAudition = await Audition.findById(savedAudition._id)
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        res.json(populatedAudition);
    } catch (err) {
        console.error('Error posting audition:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Like an audition
app.post('/api/auditions/:id/like', auth, async (req, res) => {
    try {
        const audition = await Audition.findById(req.params.id);
        if (!audition) return res.status(404).json({ message: 'Audition not found' });

        if (audition.likes.includes(req.user.id)) {
            audition.likes = audition.likes.filter(userId => userId.toString() !== req.user.id);
        } else {
            audition.likes.push(req.user.id);
        }

        await audition.save();
        const updatedAudition = await Audition.findById(req.params.id)
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        res.json(updatedAudition);
    } catch (err) {
        console.error('Error liking audition:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Comment on an audition
app.post('/api/auditions/:id/comment', auth, async (req, res) => {
    try {
        const audition = await Audition.findById(req.params.id);
        if (!audition) return res.status(404).json({ message: 'Audition not found' });

        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Comment text is required' });
        audition.comments.push({ user: req.user.id, text });
        await audition.save();

        const updatedAudition = await Audition.findById(req.params.id)
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        res.json(updatedAudition);
    } catch (err) {
        console.error('Error commenting on audition:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Bookmark an audition
app.post('/api/auditions/:id/bookmark', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const audition = await Audition.findById(req.params.id);
        if (!audition) return res.status(404).json({ message: 'Audition not found' });

        if (user.bookmarks.includes(req.params.id)) {
            user.bookmarks = user.bookmarks.filter(auditionId => auditionId.toString() !== req.params.id);
        } else {
            user.bookmarks.push(req.params.id);
        }

        await user.save();
        res.json(user);
    } catch (err) {
        console.error('Error bookmarking audition:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Submit talent for an audition
app.post('/api/auditions/:id/submit-talent', auth, async (req, res) => {
    try {
        const audition = await Audition.findById(req.params.id);
        if (!audition) return res.status(404).json({ message: 'Audition not found' });

        const { text, videoUrl } = req.body;
        if (!text) return res.status(400).json({ message: 'Talent description is required' });

        const newSubmission = new Submission({
            audition: req.params.id,
            user: req.user.id,
            text,
            videoUrl,
        });

        await newSubmission.save();

        audition.submissionCount += 1;
        await audition.save();

        const notification = new Notification({
            user: audition.createdBy,
            message: `New submission for your audition: ${audition.title}`,
            type: 'submission_update',
        });
        await notification.save();

        const populatedAudition = await Audition.findById(req.params.id)
            .populate('createdBy', 'email username')
            .populate('comments.user', 'email username');
        const submissions = await Submission.find({ audition: req.params.id })
            .populate('user', 'email username');
        res.json({ ...populatedAudition.toObject(), submissions });
    } catch (err) {
        console.error('Error submitting talent:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// Get user notifications (protected route)
app.get('/api/notifications', auth, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err.message, '\nStack:', err.stack);
        res.status(500).json({ message: 'Failed to load notifications.', error: err.message, stack: err.stack });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));