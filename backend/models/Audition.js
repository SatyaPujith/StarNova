const mongoose = require('mongoose');

const auditionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    location: {
        name: { type: String, required: true },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number },
        },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            text: { type: String, required: true },
        },
    ],
    submissionCount: { type: Number, default: 0 },
    criteriaWeights: {
        relevance: { type: Number, default: 0.4 },
        sentiment: { type: Number, default: 0.2 },
        skills: { type: Number, default: 0.2 },
        video: { type: Number, default: 0.2 },
    },
});

module.exports = mongoose.model('Audition', auditionSchema);