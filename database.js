require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@cluster0.xb2urf6.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri);

let db;
let usersCollection;

class Database {
    async connect() {
        try {
            await client.connect();
            db = client.db('typingGame');
            usersCollection = db.collection('users');
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    // Create new user
    async createUser(username, password) {
        try {
            const existingUser = await usersCollection.findOne({ username });

            if (existingUser) {
                return { success: false, error: 'Username already exists' };
            }

            const user = {
                username: username,
                password: password, // In production, hash this with bcrypt
                color: '#FF6B6B',
                highScore: 0,
                totalRaces: 0,
                wins: 0,
                wpmHistory: [], // Track last 10 races
                averageWPM: 0,
                raceHistory: [], // Store all race records with timestamp, wpm, accuracy
                createdAt: new Date()
            };

            await usersCollection.insertOne(user);
            return { success: true, user: this.getSafeUser(user) };
        } catch (error) {
            return { success: false, error: 'Database error' };
        }
    }

    // Authenticate user
    async authenticateUser(username, password) {
        try {
            const user = await usersCollection.findOne({ username });

            if (!user) {
                return { success: false, error: 'User not found' };
            }

            if (user.password !== password) {
                return { success: false, error: 'Invalid password' };
            }

            return { success: true, user: this.getSafeUser(user) };
        } catch (error) {
            return { success: false, error: 'Database error' };
        }
    }

    // Get user by username
    async getUser(username) {
        try {
            const user = await usersCollection.findOne({ username });
            return user ? this.getSafeUser(user) : null;
        } catch (error) {
            return null;
        }
    }

    // Update user color
    async updateUserColor(username, color) {
        try {
            const result = await usersCollection.updateOne(
                { username },
                { $set: { color: color } }
            );

            if (result.matchedCount > 0) {
                const user = await usersCollection.findOne({ username });
                return { success: true, user: this.getSafeUser(user) };
            }
            return { success: false, error: 'User not found' };
        } catch (error) {
            return { success: false, error: 'Database error' };
        }
    }

    // Update user stats including WPM tracking
    async updateUserStats(username, stats) {
        try {
            const user = await usersCollection.findOne({ username });
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            const updates = {};

            // Track WPM history (keep last 10 races)
            if (stats.wpm) {
                const wpmHistory = user.wpmHistory || [];
                wpmHistory.push(stats.wpm);
                if (wpmHistory.length > 10) {
                    wpmHistory.shift();
                }
                updates.wpmHistory = wpmHistory;

                // Calculate average WPM
                const sum = wpmHistory.reduce((a, b) => a + b, 0);
                updates.averageWPM = Math.round(sum / wpmHistory.length);

                // Update high score to track highest WPM instead of score
                if (!user.highScore || stats.wpm > user.highScore) {
                    updates.highScore = stats.wpm;
                }

                // Add race record to history
                const raceRecord = {
                    timestamp: new Date(),
                    wpm: stats.wpm,
                    accuracy: stats.accuracy || 100,
                    position: stats.position || null // Store 1st, 2nd, 3rd place
                };

                const raceHistory = user.raceHistory || [];
                raceHistory.push(raceRecord);
                updates.raceHistory = raceHistory;
            }

            if (stats.totalRaces) {
                updates.totalRaces = (user.totalRaces || 0) + stats.totalRaces;
            }

            if (stats.wins) {
                updates.wins = (user.wins || 0) + stats.wins;
            }

            await usersCollection.updateOne(
                { username },
                { $set: updates }
            );

            const updatedUser = await usersCollection.findOne({ username });
            return { success: true, user: this.getSafeUser(updatedUser) };
        } catch (error) {
            return { success: false, error: 'Database error' };
        }
    }

    // Get leaderboard (sorted by highest WPM)
    async getLeaderboard(limit = 10) {
        try {
            const users = await usersCollection
                .find({})
                .sort({ highScore: -1 })
                .limit(limit)
                .toArray();

            return users.map(user => this.getSafeUser(user));
        } catch (error) {
            return [];
        }
    }

    // Get user's race history
    async getRaceHistory(username, limit = 50, offset = 0) {
        try {
            const user = await usersCollection.findOne({ username });
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            const raceHistory = user.raceHistory || [];
            // Return most recent races first
            const sortedHistory = raceHistory.slice().reverse();
            const totalRaces = sortedHistory.length;

            // Apply offset and limit for pagination
            const startIndex = offset;
            const endIndex = limit ? startIndex + limit : sortedHistory.length;
            const paginatedHistory = sortedHistory.slice(startIndex, endIndex);

            return {
                success: true,
                races: paginatedHistory,
                total: totalRaces,
                hasMore: endIndex < totalRaces
            };
        } catch (error) {
            return { success: false, error: 'Database error' };
        }
    }

    // Remove password from user object
    getSafeUser(user) {
        const { password, _id, ...safeUser } = user;
        return safeUser;
    }
}

module.exports = new Database();
