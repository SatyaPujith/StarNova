const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    audition: { type: mongoose.Schema.Types.ObjectId, ref: 'Audition', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    videoUrl: { type: String },
    aiScore: { type: Number },
    feedback: [{ type: String }],
    breakdown: {
        relevance: { type: Number },
        sentiment: { type: Number },
        skills: { type: Number },
        video: { type: Number },
    },
    submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Submission', submissionSchema);