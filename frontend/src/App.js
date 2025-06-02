import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Haversine formula to calculate distance between two coordinates (in kilometers)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [submissions, setSubmissions] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!token || !user) {
            navigate('/');
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const userRes = await axios.get('https://starnova.onrender.com/api/profile', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!isMounted) return;
                setUser(userRes.data.user);

                const [submissionsRes, notificationsRes] = await Promise.all([
                    axios.get('https://starnova.onrender.com/api/submissions', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    axios.get('http://localhost:5000/api/notifications', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);

                if (!isMounted) return;
                setSubmissions(submissionsRes.data.filter(sub => sub.user?._id === user.id));
                setNotifications(notificationsRes.data);
                setBookmarks(user.bookmarks || []);
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load profile data. Please try again.');
                    console.error('Error fetching profile data:', err);
                    if (err.response?.status === 401) {
                        handleLogout();
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [token, user, navigate]);

    const handleLogout = () => {
        setToken('');
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <div className="app-container">
            <header className="header">
                <Link to="/" className="logo">Auditions Platform</Link>
                <i className="fas fa-bars menu-icon" onClick={toggleMenu}></i>
                <nav className={`nav-links ${menuOpen ? 'active' : ''}`}>
                    <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}><i className="fas fa-home"></i> Home</Link>
                    <Link to="/profile" className="nav-link" onClick={() => setMenuOpen(false)}><i className="fas fa-user"></i> Profile</Link>
                    <button
                        onClick={() => {
                            handleLogout();
                            setMenuOpen(false);
                        }}
                        className="auth-button sign-in"
                    >
                        <i className="fas fa-sign-out-alt"></i> Log Out
                    </button>
                </nav>
            </header>

            <div className="content">
                <div className="profile-container">
                    <h1 className="section-title">Your Profile</h1>
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <>
                            <div className="profile-details">
                                <h2 className="section-title">Profile Details</h2>
                                <p><strong>Username:</strong> {user.username}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> {user.role}</p>
                            </div>

                            <div className="profile-notifications">
                                <h2 className="section-title">Notifications</h2>
                                {notifications.length === 0 ? (
                                    <p>No notifications yet.</p>
                                ) : (
                                    <div className="notifications-list">
                                        {notifications.map((notification, index) => (
                                            <div key={index} className="notification">
                                                <p>{notification.message}</p>
                                                <p><small>{new Date(notification.createdAt).toLocaleString()}</small></p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="profile-submissions">
                                <h2 className="section-title">Your Submissions</h2>
                                {submissions.length === 0 ? (
                                    <p>You haven't submitted any talent yet.</p>
                                ) : (
                                    <div className="submissions-list">
                                        {submissions.map((submission, index) => (
                                            <div key={index} className="submission">
                                                <h3>{submission.audition?.title || 'Unknown Audition'}</h3>
                                                <p><strong>Description:</strong> {submission.text}</p>
                                                {submission.videoUrl && (
                                                    <p>
                                                        <strong>Video:</strong>{' '}
                                                        <a href={submission.videoUrl} target="_blank" rel="noopener noreferrer">
                                                            Watch Video
                                                        </a>
                                                    </p>
                                                )}
                                                <p><strong>AI Score:</strong> {submission.aiScore || 'Not calculated'}/100</p>
                                                {submission.feedback && submission.feedback.length > 0 && (
                                                    <div>
                                                        <p><strong>AI Feedback:</strong></p>
                                                        <ul>
                                                            {submission.feedback.map((fb, idx) => (
                                                                <li key={idx}>{fb}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {submission.breakdown && (
                                                    <div className="ai-breakdown">
                                                        <p><strong>Evaluation Breakdown:</strong></p>
                                                        <ul>
                                                            <li>Relevance: {submission.breakdown.relevance.toFixed(1)}/40</li>
                                                            <li>Sentiment: {submission.breakdown.sentiment.toFixed(1)}/20</li>
                                                            <li>Skills Match: {submission.breakdown.skills.toFixed(1)}/20</li>
                                                            <li>Video Analysis: {submission.breakdown.video.toFixed(1)}/20</li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="profile-bookmarks">
                                <h2 className="section-title">Bookmarked Auditions</h2>
                                {bookmarks.length === 0 ? (
                                    <p>You haven't bookmarked any auditions yet.</p>
                                ) : (
                                    <div className="auditions-grid">
                                        {bookmarks.map(audition => (
                                            <div key={audition._id} className="audition-card" onClick={() => window.alert(`View details for: ${audition.title}`)}>
                                                <h3 className="audition-title">{audition.title}</h3>
                                                <p className="audition-description">{audition.description}</p>
                                                <p className="audition-date">Date: {audition.date}</p>
                                                <p className="audition-location">
                                                    Location: {audition.location?.name || 'Not specified'}
                                                </p>
                                                <p className="audition-creator">
                                                    Posted by: {audition.createdBy?.email || 'Unknown'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-socials">
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in"></i></a>
                    </div>
                    <p className="footer-text">© 2025 Auditions Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function Home() {
    const navigate = useNavigate();
    const [auditions, setAuditions] = useState([]);
    const [nearbyAuditions, setNearbyAuditions] = useState([]);
    const [recommendedAuditions, setRecommendedAuditions] = useState([]);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [isSignInVisible, setIsSignInVisible] = useState(false);
    const [isSignUpVisible, setIsSignUpVisible] = useState(false);
    const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });
    const [animateSignIn, setAnimateSignIn] = useState(false);
    const [animateSignUp, setAnimateSignUp] = useState(false);
    const [authData, setAuthData] = useState({
        email: '',
        password: '',
        role: 'user',
        username: '',
    });
    const [newAudition, setNewAudition] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        criteriaWeights: {
            relevance: 0.4,
            sentiment: 0.2,
            skills: 0.2,
            video: 0.2,
        },
    });
    const [commentText, setCommentText] = useState({});
    const [talentSubmission, setTalentSubmission] = useState({});
    const [userLocation, setUserLocation] = useState(null);
    const [manualLocation, setManualLocation] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [selectedAudition, setSelectedAudition] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchUserData = async () => {
            if (token) {
                try {
                    const res = await axios.get('https://starnova.onrender.com/api/profile', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (isMounted) {
                        setUser(res.data.user);
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                    }
                } catch (err) {
                    if (isMounted) {
                        setError('Failed to fetch user data.');
                        console.error('Error fetching user data:', err);
                        if (err.response?.status === 401) {
                            handleLogout();
                        }
                    }
                }
            }
        };

        fetchUserData();

        return () => {
            isMounted = false;
        };
    }, [token]);

    useEffect(() => {
        let isMounted = true;

        const fetchAuditions = async () => {
            try {
                const res = await axios.get('https://starnova.onrender.com/api/auditions', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (isMounted) setAuditions(res.data || []);
            } catch (err) {
                if (isMounted) {
                    setError('Failed to fetch auditions.');
                    console.error('Error fetching auditions:', err);
                }
            }
        };

        const fetchRecommendations = async () => {
            if (token && user && user.role === 'user') {
                try {
                    const res = await axios.get('https://starnova.onrender.com/api/auditions/recommendations', {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (isMounted) setRecommendedAuditions(res.data || []);
                } catch (err) {
                    if (isMounted) {
                        console.error('Error fetching recommendations:', err);
                        setError('Failed to load recommended auditions.');
                    }
                }
            }
        };

        fetchAuditions();
        fetchRecommendations();

        return () => {
            isMounted = false;
        };
    }, [token, user]);

    useEffect(() => {
        let isMounted = true;

        const fetchLocationAndNearby = async () => {
            setLoading(true);
            setError(null);

            try {
                const locationPromise = new Promise((resolve) => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            async (position) => {
                                const { latitude, longitude } = position.coords;
                                try {
                                    const response = await fetch(
                                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                                    );
                                    const data = await response.json();
                                    const city = data.address.city || data.address.town || data.address.village || 'Unknown';
                                    const state = data.address.state || '';
                                    resolve({ latitude, longitude, name: `${city}, ${state}` });
                                } catch (err) {
                                    resolve({ latitude: 40.7128, longitude: -74.0060, name: 'New York, NY' });
                                }
                            },
                            () => {
                                resolve({ latitude: 40.7128, longitude: -74.0060, name: 'New York, NY' });
                            }
                        );
                    } else {
                        resolve({ latitude: 40.7128, longitude: -74.0060, name: 'New York, NY' });
                    }
                });

                const [fetchedLocation] = await Promise.all([locationPromise]);
                if (!isMounted) return;

                setUserLocation(fetchedLocation);

                const sortedAuditions = auditions
                    .filter((audition) => audition.location?.coordinates?.latitude && audition.location?.coordinates?.longitude)
                    .map((audition) => {
                        const distance = calculateDistance(
                            fetchedLocation.latitude,
                            fetchedLocation.longitude,
                            audition.location.coordinates.latitude,
                            audition.location.coordinates.longitude
                        );
                        return { ...audition, distance };
                    })
                    .sort((a, b) => a.distance - b.distance);

                setNearbyAuditions(sortedAuditions.filter((audition) => audition.distance <= 100));
            } catch (err) {
                if (isMounted) {
                    setError('Failed to load location or nearby auditions.');
                    console.error(err);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchLocationAndNearby();

        return () => {
            isMounted = false;
        };
    }, [auditions]);

    useEffect(() => {
        if (isSignInVisible) {
            setAnimateSignIn(true);
            const timer = setTimeout(() => setAnimateSignIn(false), 300); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [isSignInVisible]);

    useEffect(() => {
        if (isSignUpVisible) {
            setAnimateSignUp(true);
            const timer = setTimeout(() => setAnimateSignUp(false), 300); // Match animation duration
            return () => clearTimeout(timer);
        }
    }, [isSignUpVisible]);

    const handleManualLocationSearch = useCallback(async () => {
        if (!manualLocation) {
            setError('Please enter a location');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualLocation)}`
            );
            const data = await response.json();
            if (data.length > 0) {
                const { lat, lon } = data[0];
                const newLocation = { latitude: parseFloat(lat), longitude: parseFloat(lon), name: manualLocation };
                setUserLocation(newLocation);

                const sortedAuditions = auditions
                    .filter((audition) => audition.location?.coordinates?.latitude && audition.location?.coordinates?.longitude)
                    .map((audition) => {
                        const distance = calculateDistance(
                            parseFloat(lat),
                            parseFloat(lon),
                            audition.location.coordinates.latitude,
                            audition.location.coordinates.longitude
                        );
                        return { ...audition, distance };
                    })
                    .sort((a, b) => a.distance - b.distance);

                setNearbyAuditions(sortedAuditions.filter((audition) => audition.distance <= 100));
            } else {
                setError('Location not found');
            }
        } catch (err) {
            setError('Error fetching location');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [manualLocation, auditions]);

    const handleAuthChange = (e) => {
        setAuthData({ ...authData, [e.target.name]: e.target.value });
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        const url = isSignInVisible ? '/api/login' : '/api/register';
        try {
            const res = await axios.post(`https://star-nova-xce5.vercel.app/${url}`, authData);
            setToken(res.data.token);
            setUser(res.data.user);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setAuthData({ email: '', password: '', role: 'user', username: '' });
            setIsSignInVisible(false);
            setIsSignUpVisible(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed');
            console.error('Auth error:', err);
        }
    };

    const handleLogout = () => {
        setToken('');
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setNearbyAuditions([]);
        setRecommendedAuditions([]);
        navigate('/');
    };

    const handleInputChange = (e) => {
        if (e.target.name.startsWith('criteriaWeights.')) {
            const field = e.target.name.split('.')[1];
            setNewAudition({
                ...newAudition,
                criteriaWeights: {
                    ...newAudition.criteriaWeights,
                    [field]: parseFloat(e.target.value) || 0,
                },
            });
        } else {
            setNewAudition({ ...newAudition, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newAudition.location) {
            setError('Please enter a location');
            return;
        }

        const totalWeight =
            newAudition.criteriaWeights.relevance +
            newAudition.criteriaWeights.sentiment +
            newAudition.criteriaWeights.skills +
            newAudition.criteriaWeights.video;
        if (Math.abs(totalWeight - 1) > 0.01) {
            setError('Criteria weights must sum to 1');
            return;
        }

        try {
            let auditionData;
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAudition.location)}`
            );
            const data = await response.json();
            if (data.length === 0) {
                auditionData = {
                    ...newAudition,
                    location: {
                        name: newAudition.location,
                        coordinates: { latitude: null, longitude: null },
                    },
                };
            } else {
                const { lat, lon } = data[0];
                auditionData = {
                    ...newAudition,
                    location: {
                        name: newAudition.location,
                        coordinates: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
                    },
                };
            }

            const res = await axios.post('https://starnova.onrender.com/api/auditions', auditionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAuditions([...auditions, res.data]);
            setNewAudition({
                title: '',
                description: '',
                date: '',
                location: '',
                criteriaWeights: { relevance: 0.4, sentiment: 0.2, skills: 0.2, video: 0.2 },
            });
            if (userLocation) {
                const sortedAuditions = [...auditions, res.data]
                    .filter(a => a.location?.coordinates?.latitude && a.location?.coordinates?.longitude)
                    .map(a => ({
                        ...a,
                        distance: calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            a.location.coordinates.latitude,
                            a.location.coordinates.longitude
                        ),
                    }))
                    .sort((a, b) => a.distance - b.distance);
                setNearbyAuditions(sortedAuditions.filter(a => a.distance <= 100));
            }
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to post audition');
            console.error('Error posting audition:', err);
        }
    };

    const handleLike = (auditionId) => {
        if (!user) {
            setError('Please log in to like an audition');
            return;
        }
        axios.post(`https://starnova.onrender.com/api/auditions/${auditionId}/like`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setAuditions(auditions.map(a => a._id === auditionId ? res.data : a));
                setNearbyAuditions(nearbyAuditions.map(a => a._id === auditionId ? res.data : a));
                setRecommendedAuditions(recommendedAuditions.map(a => a._id === auditionId ? res.data : a));
                setError(null);
            })
            .catch((err) => {
                setError(err.response?.data?.message || 'Failed to like audition');
                console.error('Like error:', err);
            });
    };

    const handleComment = (auditionId) => {
        if (!user) {
            setError('Please log in to comment');
            return;
        }
        if (!commentText[auditionId]) {
            setError('Please enter a comment');
            return;
        }
        axios.post(`https://starnova.onrender.com/api/auditions/${auditionId}/comment`, { text: commentText[auditionId] }, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setAuditions(auditions.map(a => a._id === auditionId ? res.data : a));
                setNearbyAuditions(nearbyAuditions.map(a => a._id === auditionId ? res.data : a));
                setRecommendedAuditions(recommendedAuditions.map(a => a._id === auditionId ? res.data : a));
                setCommentText({ ...commentText, [auditionId]: '' });
                setError(null);
            })
            .catch((err) => {
                setError(err.response?.data?.message || 'Failed to add comment');
                console.error('Comment error:', err);
            });
    };

    const handleShare = (auditionId) => {
        if (!user) {
            setError('Please log in to share');
            return;
        }
        const url = `${window.location.origin}/audition/${auditionId}`;
        navigator.clipboard.writeText(url)
            .then(() => alert('Link copied to clipboard!'))
            .catch(() => setError('Failed to copy link'));
    };

    const handleBookmark = (auditionId) => {
        if (!user) {
            setError('Please log in to bookmark');
            return;
        }
        axios.post(`https://starnova.onrender.com/api/auditions/${auditionId}/bookmark`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setUser({ ...user, bookmarks: res.data.bookmarks });
                localStorage.setItem('user', JSON.stringify({ ...user, bookmarks: res.data.bookmarks }));
                setError(null);
            })
            .catch((err) => {
                setError(err.response?.data?.message || 'Failed to bookmark');
                console.error('Bookmark error:', err);
            });
    };

    const handleTalentSubmit = (auditionId) => {
        if (!user) {
            setError('Please log in to submit talent');
            return;
        }
        const submission = talentSubmission[auditionId] || {};
        if (!submission.text) {
            setError('Please provide a description');
            return;
        }
        axios.post(`https://starnova.onrender.com/api/auditions/${auditionId}/submit-talent`, submission, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                setAuditions(auditions.map(a => a._id === auditionId ? res.data : a));
                setNearbyAuditions(nearbyAuditions.map(a => a._id === auditionId ? res.data : a));
                setRecommendedAuditions(recommendedAuditions.map(a => a._id === auditionId ? res.data : a));
                setTalentSubmission({ ...talentSubmission, [auditionId]: { text: '', videoUrl: '' } });
                setError(null);
                alert('Talent submitted successfully!');
            })
            .catch((err) => {
                setError(err.response?.data?.message || 'Failed to submit talent');
                console.error('Talent submission error:', err);
            });
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const openAuditionDetails = (audition) => {
        setSelectedAudition(audition);
    };

    const closeAuditionDetails = () => {
        setSelectedAudition(null);
    };

    const handleSignInClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setClickPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsSignInVisible(!isSignInVisible);
        setIsSignUpVisible(false);
        setMenuOpen(false);
    };

    const handleSignUpClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setClickPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsSignUpVisible(!isSignUpVisible);
        setIsSignInVisible(false);
        setMenuOpen(false);
    };

    return (
        <div className="app-container">
            <header className="header">
                <Link to="/" className="logo">Auditions Platform</Link>
                <i className="fas fa-bars menu-icon" onClick={toggleMenu}></i>
                <nav className={`nav-links ${menuOpen ? 'active' : ''}`}>
                    <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}><i className="fas fa-home"></i> Home</Link>
                    <Link to="/profile" className="nav-link" onClick={() => setMenuOpen(false)}><i className="fas fa-user"></i> Profile</Link>
                    {user ? (
                        <button
                            onClick={() => {
                                handleLogout();
                                setMenuOpen(false);
                            }}
                            className="auth-button sign-in"
                        >
                            <i className="fas fa-sign-out-alt"></i> Log Out
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleSignInClick}
                                className="auth-button sign-in"
                            >
                                <i className="fas fa-sign-in-alt"></i> Sign In
                            </button>
                            <button
                                onClick={handleSignUpClick}
                                className="auth-button join"
                            >
                                <i className="fas fa-user-plus"></i> Sign Up
                            </button>
                        </>
                    )}
                </nav>
            </header>

            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Find Your Next Big Role</h1>
                    <p className="hero-subtitle">
                        Discover auditions near you and showcase your talent with AI-powered evaluations.
                    </p>
                    <div className="location-search">
                        <input
                            type="text"
                            value={manualLocation}
                            onChange={(e) => setManualLocation(e.target.value)}
                            placeholder="Enter your location (e.g., New York, NY)"
                            className="form-input"
                        />
                        <button onClick={handleManualLocationSearch} className="hero-button">
                            Search
                        </button>
                    </div>
                </div>
            </section>

            <div className="content">
                {error && <div className="error-message">{error}</div>}
                {!user && (
                    <div className="auth-cards">
                        {isSignInVisible && (
                            <div
                                className={`auth-card ${animateSignIn ? 'animate' : ''}`}
                                style={{
                                    transformOrigin: `${clickPosition.x}px ${clickPosition.y}px`,
                                }}
                            >
                                <h2 className="form-title">Log In</h2>
                                <form onSubmit={handleAuthSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={authData.email}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={authData.password}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="submit-button">
                                        Log In
                                    </button>
                                </form>
                                <p className="toggle-auth">
                                    Don't have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUpVisible(true);
                                            setIsSignInVisible(false);
                                        }}
                                        className="toggle-link"
                                    >
                                        Sign Up
                                    </button>
                                </p>
                            </div>
                        )}
                        {isSignUpVisible && (
                            <div
                                className={`auth-card ${animateSignUp ? 'animate' : ''}`}
                                style={{
                                    transformOrigin: `${clickPosition.x}px ${clickPosition.y}px`,
                                }}
                            >
                                <h2 className="form-title">Sign Up</h2>
                                <form onSubmit={handleAuthSubmit}>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={authData.email}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={authData.password}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={authData.username}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Role</label>
                                        <select
                                            name="role"
                                            value={authData.role}
                                            onChange={handleAuthChange}
                                            className="form-input"
                                        >
                                            <option value="user">User</option>
                                            <option value="organizer">Organizer</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="submit-button">
                                        Sign Up
                                    </button>
                                </form>
                                <p className="toggle-auth">
                                    Already have an account?{' '}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignInVisible(true);
                                            setIsSignUpVisible(false);
                                        }}
                                        className="toggle-link"
                                    >
                                        Log In
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {user && (
                    <div className="toggle-container">
                        <p>Welcome, {user.email} ({user.role})</p>
                    </div>
                )}

                {user && user.role === 'organizer' && (
                    <div className="form-container">
                        <h2 className="form-title">Post a New Audition</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={newAudition.title}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    name="description"
                                    value={newAudition.description}
                                    onChange={handleInputChange}
                                    className="form-textarea"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={newAudition.date}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={newAudition.location}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="e.g., New York, NY"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Criteria Weights (must sum to 1)</label>
                                <div className="criteria-weights">
                                    {['relevance', 'sentiment', 'skills', 'video'].map(field => (
                                        <div key={field} className="weight-input">
                                            <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                name={`criteriaWeights.${field}`}
                                                value={newAudition.criteriaWeights[field]}
                                                onChange={handleInputChange}
                                                className="form-input"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="submit-button">
                                Post Audition
                            </button>
                        </form>
                    </div>
                )}

                <div className="auditions-container">
                    {user && user.role === 'user' && (
                        <>
                            <h2 className="section-title">Recommended Auditions</h2>
                            {loading ? (
                                <div className="loading-spinner">Loading...</div>
                            ) : error ? (
                                <div className="error-message">{error}</div>
                            ) : recommendedAuditions.length === 0 ? (
                                <p className="no-data-message">
                                    Submit some talent to get personalized recommendations!
                                </p>
                            ) : (
                                <div className="auditions-grid">
                                    {recommendedAuditions.map((audition) => (
                                        <div key={audition._id} className="audition-card" onClick={() => openAuditionDetails(audition)}>
                                            <h3 className="audition-title">{audition.title}</h3>
                                            <p className="audition-description">{audition.description.substring(0, 100) + '...'}</p>
                                            <p className="audition-date">Date: {audition.date}</p>
                                            <p className="audition-location">
                                                Location: {audition.location?.name || 'Not specified'}
                                                {userLocation && audition.location?.coordinates?.latitude && audition.location?.coordinates?.longitude && (
                                                    <span>
                                                        {' '}
                                                        ({Math.round(calculateDistance(
                                                            userLocation.latitude,
                                                            userLocation.longitude,
                                                            audition.location.coordinates.latitude,
                                                            audition.location.coordinates.longitude
                                                        ))} km away)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="interaction-container">
                                                <button onClick={(e) => { e.stopPropagation(); handleLike(audition._id); }} className="interaction-button">
                                                    <i className={audition.likes.includes(user?.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                                                    {audition.likes.length}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleShare(audition._id); }} className="interaction-button">
                                                    <i className="fas fa-share"></i> Share
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleBookmark(audition._id); }} className="interaction-button">
                                                    <i className={user?.bookmarks?.includes(audition._id) ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
                                                    {user?.bookmarks?.includes(audition._id) ? 'Unbookmark' : 'Bookmark'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    <h2 className="section-title">Nearby Auditions</h2>
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : nearbyAuditions.length === 0 ? (
                        <p className="no-data-message">
                            No auditions found near {userLocation?.name || 'your location'}. Try searching for a different location.
                        </p>
                    ) : (
                        <div className="auditions-grid">
                            {nearbyAuditions.map((audition) => (
                                <div key={audition._id} className="audition-card" onClick={() => openAuditionDetails(audition)}>
                                    <h3 className="audition-title">{audition.title}</h3>
                                    <p className="audition-description">{audition.description.substring(0, 100) + '...'}</p>
                                    <p className="audition-date">Date: {audition.date}</p>
                                    <p className="audition-location">
                                        Location: {audition.location?.name || 'Not specified'}
                                        {userLocation && audition.location?.coordinates?.latitude && audition.location?.coordinates?.longitude && (
                                            <span>
                                                {' '}
                                                ({Math.round(audition.distance)} km away)
                                            </span>
                                        )}
                                    </p>
                                    <div className="interaction-container">
                                        <button onClick={(e) => { e.stopPropagation(); handleLike(audition._id); }} className="interaction-button">
                                            <i className={audition.likes.includes(user?.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                                            {audition.likes.length}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleShare(audition._id); }} className="interaction-button">
                                            <i className="fas fa-share"></i> Share
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleBookmark(audition._id); }} className="interaction-button">
                                            <i className={user?.bookmarks?.includes(audition._id) ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
                                            {user?.bookmarks?.includes(audition._id) ? 'Unbookmark' : 'Bookmark'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <h2 className="section-title">All Auditions</h2>
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : auditions.length === 0 ? (
                        <p className="no-data-message">No auditions available at the moment.</p>
                    ) : (
                        <div className="auditions-grid">
                            {auditions.map((audition) => (
                                <div key={audition._id} className="audition-card" onClick={() => openAuditionDetails(audition)}>
                                    <h3 className="audition-title">{audition.title}</h3>
                                    <p className="audition-description">{audition.description.substring(0, 100) + '...'}</p>
                                    <p className="audition-date">Date: {audition.date}</p>
                                    <p className="audition-location">
                                        Location: {audition.location?.name || 'Not specified'}
                                        {userLocation && audition.location?.coordinates?.latitude && audition.location?.coordinates?.longitude && (
                                            <span>
                                                {' '}
                                                ({Math.round(calculateDistance(
                                                    userLocation.latitude,
                                                    userLocation.longitude,
                                                    audition.location.coordinates.latitude,
                                                    audition.location.coordinates.longitude
                                                ))} km away)
                                            </span>
                                        )}
                                    </p>
                                    <div className="interaction-container">
                                        <button onClick={(e) => { e.stopPropagation(); handleLike(audition._id); }} className="interaction-button">
                                            <i className={audition.likes.includes(user?.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                                            {audition.likes.length}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleShare(audition._id); }} className="interaction-button">
                                            <i className="fas fa-share"></i> Share
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleBookmark(audition._id); }} className="interaction-button">
                                            <i className={user?.bookmarks?.includes(audition._id) ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
                                            {user?.bookmarks?.includes(audition._id) ? 'Unbookmark' : 'Bookmark'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedAudition && (
                <div className="modal" onClick={closeAuditionDetails}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 className="audition-title">{selectedAudition.title}</h2>
                        <p className="audition-description">{selectedAudition.description}</p>
                        <p className="audition-date">Date: {selectedAudition.date}</p>
                        <p className="audition-location">
                            Location: {selectedAudition.location?.name || 'Not specified'}
                            {userLocation && selectedAudition.location?.coordinates?.latitude && selectedAudition.location?.coordinates?.longitude && (
                                <span>
                                    {' '}
                                    ({Math.round(calculateDistance(
                                        userLocation.latitude,
                                        userLocation.longitude,
                                        selectedAudition.location.coordinates.latitude,
                                        selectedAudition.location.coordinates.longitude
                                    ))} km away)
                                </span>
                            )}
                        </p>
                        <p className="audition-creator">
                            Posted by: {selectedAudition.createdBy?.email || 'Unknown'}
                        </p>
                        <div className="interaction-container">
                            <button onClick={(e) => { e.stopPropagation(); handleLike(selectedAudition._id); closeAuditionDetails(); }} className="interaction-button">
                                <i className={selectedAudition.likes.includes(user?.id) ? 'fas fa-heart' : 'far fa-heart'}></i>
                                {selectedAudition.likes.length}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(selectedAudition._id); closeAuditionDetails(); }} className="interaction-button">
                                <i className="fas fa-share"></i> Share
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleBookmark(selectedAudition._id); closeAuditionDetails(); }} className="interaction-button">
                                <i className={user?.bookmarks?.includes(selectedAudition._id) ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
                                {user?.bookmarks?.includes(selectedAudition._id) ? 'Unbookmark' : 'Bookmark'}
                            </button>
                        </div>
                        <div className="comments-section">
                            <h4>Comments</h4>
                            {selectedAudition.comments.map((comment, index) => (
                                <div key={index} className="comment">
                                    <p><strong>{comment.user?.email || 'Unknown'}:</strong> {comment.text}</p>
                                </div>
                            ))}
                            {user && (
                                <div className="comment-form">
                                    <input
                                        type="text"
                                        value={commentText[selectedAudition._id] || ''}
                                        onChange={(e) => setCommentText({ ...commentText, [selectedAudition._id]: e.target.value })}
                                        placeholder="Add a comment..."
                                        className="form-input"
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); handleComment(selectedAudition._id); }} className="submit-button">
                                        <i className="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            )}
                        </div>
                        {user && user.role !== 'organizer' && (
                            <div className="talent-submission-section">
                                <h4>Submit Your Talent</h4>
                                <div className="talent-form">
                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea
                                            value={talentSubmission[selectedAudition._id]?.text || ''}
                                            onChange={(e) => setTalentSubmission({
                                                ...talentSubmission,
                                                [selectedAudition._id]: { ...talentSubmission[selectedAudition._id], text: e.target.value }
                                            })}
                                            placeholder="Describe your talent..."
                                            className="form-textarea"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Video URL (Optional)</label>
                                        <input
                                            type="url"
                                            value={talentSubmission[selectedAudition._id]?.videoUrl || ''}
                                            onChange={(e) => setTalentSubmission({
                                                ...talentSubmission,
                                                [selectedAudition._id]: { ...talentSubmission[selectedAudition._id], videoUrl: e.target.value }
                                            })}
                                            placeholder="e.g., https://youtube.com/watch?v=..."
                                            className="form-input"
                                        />
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleTalentSubmit(selectedAudition._id); }} className="submit-button">
                                        Submit Talent
                                    </button>
                                </div>
                            </div>
                        )}
                        {user && user.role === 'organizer' && (
                            <div className="submissions-section">
                                <h4>Submissions</h4>
                                {selectedAudition.submissions.length === 0 ? (
                                    <p>No submissions yet.</p>
                                ) : (
                                    <div className="submissions-list">
                                        {selectedAudition.submissions
                                            .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
                                            .map((submission, index) => (
                                                <div key={index} className="submission">
                                                    <p><strong>User:</strong> {submission.user?.username || 'Unknown'}</p>
                                                    <p><strong>Description:</strong> {submission.text}</p>
                                                    {submission.videoUrl && (
                                                        <p>
                                                            <strong>Video:</strong>{' '}
                                                            <a href={submission.videoUrl} target="_blank" rel="noopener noreferrer">
                                                                Watch Video
                                                            </a>
                                                        </p>
                                                    )}
                                                    <p><strong>AI Score:</strong> {submission.aiScore || 'Not calculated'}/100</p>
                                                    {submission.feedback && submission.feedback.length > 0 && (
                                                        <div>
                                                            <p><strong>AI Feedback:</strong></p>
                                                            <ul>
                                                                {submission.feedback.map((fb, idx) => (
                                                                    <li key={idx}>{fb}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {submission.breakdown && (
                                                        <div className="ai-breakdown">
                                                            <p><strong>Evaluation Breakdown:</strong></p>
                                                            <ul>
                                                                <li>Relevance: {submission.breakdown.relevance.toFixed(1)}/40</li>
                                                                <li>Sentiment: {submission.breakdown.sentiment.toFixed(1)}/20</li>
                                                                <li>Skills Match: {submission.breakdown.skills.toFixed(1)}/20</li>
                                                                <li>Video Analysis: {submission.breakdown.video.toFixed(1)}/20</li>
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={closeAuditionDetails} className="submit-button close-button">
                            Close
                        </button>
                    </div>
                </div>
            )}

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-socials">
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in"></i></a>
                    </div>
                    <p className="footer-text">© 2025 Auditions Platform. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </Router>
    );
}

export default App;
