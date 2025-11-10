require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Game state
const players = new Map();
const races = new Map();
let typingTexts = [];

// Bot names
const BOT_NAMES = [
    'SpeedyBot', 'TypeMaster', 'QuickKeys', 'FastFingers', 'RapidRacer',
    'TurboTyper', 'SwiftScribe', 'KeyboardKing', 'LetterLegend', 'WordWarrior',
    'TypeTitan', 'QuickQuill', 'SpeedDemon', 'FastWriter', 'RapidWriter'
];

// Load typing texts from CSV
function loadTypingTexts() {
    try {
        const csvContent = fs.readFileSync(path.join(__dirname, 'typing_texts.csv'), 'utf-8');
        const lines = csvContent.split('\n').slice(1); // Skip header

        typingTexts = lines
            .filter(line => line.trim())
            .map(line => {
                // Parse CSV line (handle quotes)
                let text = line.trim();

                // Remove outer quotes
                if (text.startsWith('"') && text.endsWith('"')) {
                    text = text.slice(1, -1);
                }

                // Replace double quotes with single
                text = text.replace(/""/g, '"');

                // Remove soft hyphens and zero-width characters
                text = text.replace(/[\u00AD\u200B-\u200D\uFEFF]/g, '');

                // Remove leading/trailing whitespace and normalize spaces
                text = text.trim().replace(/\s+/g, ' ');

                return text;
            })
            .filter(text => text && text.length > 20 && !text.startsWith('"')); // Filter out malformed texts

        console.log(`Loaded ${typingTexts.length} typing texts`);
    } catch (error) {
        console.error('Error loading typing texts:', error);
        // Fallback texts
        typingTexts = [
            'The quick brown fox jumps over the lazy dog',
            'Pack my box with five dozen liquor jugs',
            'How vexingly quick daft zebras jump'
        ];
    }
}

loadTypingTexts();

// Get random text based on WPM level
function getTextForWPM(averageWPM) {
    if (!typingTexts.length) return 'The quick brown fox jumps over the lazy dog';

    // Calculate target length for ~20 seconds of typing
    // Formula: characters = WPM * (seconds/60) * average_chars_per_word
    // For 20 seconds: characters = WPM * (20/60) * 5 ≈ WPM * 1.67
    const targetLength = Math.round(averageWPM * 1.67);

    // Get a random text (prefer longer texts that we can shorten)
    const longTexts = typingTexts.filter(text => text.length >= targetLength);
    let selectedText;

    if (longTexts.length > 0) {
        selectedText = longTexts[Math.floor(Math.random() * longTexts.length)];
    } else {
        // Fallback to any text if none are long enough
        selectedText = typingTexts[Math.floor(Math.random() * typingTexts.length)];
    }

    // Shorten text to target length, cutting at word boundary
    if (selectedText.length > targetLength) {
        let shortened = selectedText.substring(0, targetLength);
        // Find the last space to cut at a word boundary
        const lastSpace = shortened.lastIndexOf(' ');
        if (lastSpace > targetLength * 0.8) { // Only cut at word boundary if not too short
            shortened = shortened.substring(0, lastSpace);
        }
        return shortened;
    }

    return selectedText;
}

// Create bot player
function createBot(raceId, targetWPM, laneX) {
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#FF69B4'];

    // Bot WPM varies around target (±10 WPM) for more accurate matching
    const botWPM = Math.max(20, targetWPM + (Math.random() * 20 - 10));

    const bot = {
        id: botId,
        username: name,
        position: { x: laneX, y: 0.5, z: -50 },
        progress: 0,
        score: 0,
        currentWord: '',
        isTyping: true,
        color: colors[Math.floor(Math.random() * colors.length)],
        isBot: true,
        wpm: botWPM,
        errorRate: 0.02 + Math.random() * 0.03, // 2-5% error rate
        currentIndex: 0
    };

    return bot;
}

// Bot typing simulation
function simulateBotTyping(bot, text, race) {
    if (race.state !== 'racing' || bot.progress >= 100) {
        return;
    }

    // Calculate typing speed (chars per second based on WPM)
    const charsPerSecond = (bot.wpm * 5) / 60; // Average 5 chars per word
    const charsPerTick = charsPerSecond * 0.1; // Update every 100ms

    // Add some randomness to speed
    const variance = 0.8 + Math.random() * 0.4; // 0.8-1.2x speed
    const actualChars = charsPerTick * variance;

    // Simulate typing with errors
    let typed = bot.currentIndex;
    const shouldMakeError = Math.random() < bot.errorRate;

    if (shouldMakeError && typed < text.length) {
        // Bot makes an error - pause for a bit (will be stuck for a few ticks)
        setTimeout(() => {
            bot.currentIndex = typed;
        }, 200 + Math.random() * 300);
    } else {
        // Progress typing
        typed = Math.min(typed + actualChars, text.length);
        bot.currentIndex = typed;
        bot.currentWord = text.substring(0, Math.floor(typed));
    }

    // Update progress
    bot.progress = (bot.currentIndex / text.length) * 100;
    bot.position.z = -50 + bot.progress;

    // Emit update to all players
    io.to(race.id).emit('playerTyping', {
        id: bot.id,
        currentWord: bot.currentWord,
        isTyping: true,
        progress: bot.progress,
        position: bot.position
    });

    // Check if bot finished
    if (bot.progress >= 100 && !bot.finished) {
        bot.finished = true;
        const finishTime = (Date.now() - race.startTime) / 1000;
        bot.score = Math.round((text.length / finishTime) * 10);

        // Add to finishing order
        race.finishingOrder.push({
            id: bot.id,
            username: bot.username,
            score: bot.score
        });

        io.to(race.id).emit('raceFinished', {
            id: bot.id,
            username: bot.username,
            score: bot.score,
            position: race.finishingOrder.length
        });

        // Check if all players finished
        checkRaceCompletion(race);
    }
}

// Check if race is complete
function checkRaceCompletion(race) {
    const allFinished = race.players.every(p => p.progress >= 100);

    if (allFinished && race.state === 'racing') {
        race.state = 'finished';

        // Don't auto-reset, let players choose to start a new race
        // The "Start New Race" button will reload the page for them
    }
}

// Get lane position based on player index
function getLanePosition(playerIndex) {
    // 5 lanes spread across the track: -6, -3, 0, 3, 6
    const lanes = [-6, -3, 0, 3, 6];
    return lanes[playerIndex % lanes.length];
}

// Get WPM range for matchmaking
function getWPMRange(averageWPM) {
    if (averageWPM < 30) return 'beginner'; // 0-30 WPM
    if (averageWPM < 50) return 'intermediate'; // 30-50 WPM
    if (averageWPM < 70) return 'advanced'; // 50-70 WPM
    return 'expert'; // 70+ WPM
}

// Create or join race
function joinRace(player) {
    const playerWPMRange = getWPMRange(player.averageWPM || 40);

    // Find an existing race in waiting state with similar WPM range
    let race = null;

    for (const [id, r] of races.entries()) {
        if (r.state === 'waiting' && r.players.length < 5 && r.wpmRange === playerWPMRange) {
            race = r;
            break;
        }
    }

    // Create new race if none available
    if (!race) {
        const raceId = `race_${Date.now()}`;
        const avgWPM = player.averageWPM || 40;
        const text = getTextForWPM(avgWPM);

        race = {
            id: raceId,
            players: [],
            state: 'waiting', // waiting, countdown, racing, finished
            text: text,
            countdownTime: 3,
            startTime: null,
            wpmRange: playerWPMRange,
            targetWPM: avgWPM,
            finishingOrder: [] // Track order of finishers
        };

        races.set(raceId, race);
    }

    // Assign lane position to player
    const laneX = getLanePosition(race.players.length);
    player.position.x = laneX;

    // Add player to race
    player.raceId = race.id;
    race.players.push(player);

    // Update target WPM based on average of all real players
    const realPlayers = race.players.filter(p => !p.isBot);
    if (realPlayers.length > 0) {
        const totalWPM = realPlayers.reduce((sum, p) => sum + (p.averageWPM || 40), 0);
        race.targetWPM = totalWPM / realPlayers.length;
    }

    // Schedule bot insertion with delays (wait for real players first)
    if (!race.botTimer && race.state === 'waiting') {
        race.botTimer = setTimeout(() => {
            addBotsToRace(race, race.targetWPM);
        }, 3000); // Wait 3 seconds for real players
    }

    return race;
}

// Add bots with delays
function addBotsToRace(race, targetWPM) {
    if (race.state !== 'waiting') return;

    const botsNeeded = 5 - race.players.length;
    if (botsNeeded <= 0) return;

    let botIndex = 0;

    const addBotInterval = setInterval(() => {
        if (botIndex >= botsNeeded || race.players.length >= 5 || race.state !== 'waiting') {
            clearInterval(addBotInterval);

            // Start countdown when we have 5 players
            if (race.players.length === 5 && race.state === 'waiting') {
                startCountdown(race);
            }
            return;
        }

        const laneX = getLanePosition(race.players.length);
        const bot = createBot(race.id, targetWPM, laneX);
        bot.raceId = race.id;
        race.players.push(bot);
        players.set(bot.id, bot);

        // Notify all players that a bot joined
        io.to(race.id).emit('playerJoined', bot);

        botIndex++;

        // Start countdown if we reached 5 players
        if (race.players.length === 5 && race.state === 'waiting') {
            clearInterval(addBotInterval);
            startCountdown(race);
        }
    }, 2000); // 2 seconds between each bot
}

// Start countdown
function startCountdown(race) {
    if (race.state !== 'waiting') return;

    race.state = 'countdown';
    race.countdownTime = 3;

    io.to(race.id).emit('raceCountdown', { countdown: race.countdownTime });

    const countdownInterval = setInterval(() => {
        race.countdownTime--;

        io.to(race.id).emit('raceCountdown', { countdown: race.countdownTime });

        if (race.countdownTime <= 0) {
            clearInterval(countdownInterval);
            startRace(race);
        }
    }, 1000);
}

// Start race
function startRace(race) {
    race.state = 'racing';
    race.startTime = Date.now();

    io.to(race.id).emit('raceStart');

    // Start bot simulation
    race.players.forEach(player => {
        if (player.isBot) {
            player.botInterval = setInterval(() => {
                simulateBotTyping(player, race.text, race);
            }, 100);
        }
    });
}

// Reset race
function resetRace(raceId) {
    const race = races.get(raceId);
    if (!race) return;

    // Stop bot intervals
    race.players.forEach(player => {
        if (player.isBot && player.botInterval) {
            clearInterval(player.botInterval);
        }
    });

    // Remove bots
    race.players.forEach(player => {
        if (player.isBot) {
            players.delete(player.id);
        }
    });

    races.delete(raceId);

    io.to(raceId).emit('raceReset');
}

// Authentication endpoints
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const result = await database.createUser(username, password);

    if (result.success) {
        // Generate JWT token
        const token = jwt.sign(
            { username: result.user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ success: true, user: result.user, token });
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await database.authenticateUser(username, password);

    if (result.success) {
        // Generate JWT token
        const token = jwt.sign(
            { username: result.user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ success: true, user: result.user, token });
    } else {
        res.status(401).json({ error: result.error });
    }
});

// Verify token and get user data
app.post('/api/verify', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: 'Token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await database.getUser(decoded.username);

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(401).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Change car color
app.post('/api/changeColor', async (req, res) => {
    const { username, color } = req.body;

    if (!username || !color) {
        return res.status(400).json({ error: 'Username and color required' });
    }

    const result = await database.updateUserColor(username, color);

    if (result.success) {
        res.json({ success: true });
    } else {
        res.status(400).json({ error: result.error });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const leaderboard = await database.getLeaderboard(10);
    res.json(leaderboard);
});

app.get('/api/raceHistory/:username', async (req, res) => {
    const { username } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const result = await database.getRaceHistory(username, limit, offset);

    if (result.success) {
        res.json({
            success: true,
            races: result.races,
            total: result.total,
            hasMore: result.hasMore
        });
    } else {
        res.status(404).json({ error: result.error });
    }
});

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    let authenticatedUser = null;

    // Handle user authentication via socket
    socket.on('authenticate', async (data) => {
        authenticatedUser = data.username;
        const user = await database.getUser(data.username);

        // Initialize player with user data
        const player = {
            id: socket.id,
            username: data.username,
            position: { x: 0, y: 0.5, z: -50 },
            progress: 0,
            score: 0,
            currentWord: '',
            isTyping: false,
            color: user ? user.color : '#FF6B6B',
            highScore: user ? user.highScore : 0,
            averageWPM: user ? user.averageWPM : 40,
            isBot: false,
            raceId: null
        };

        players.set(socket.id, player);

        // Join or create race
        const race = joinRace(player);
        socket.join(race.id);

        // Send initial game state to new player
        socket.emit('init', {
            playerId: socket.id,
            players: race.players,
            text: race.text,
            raceState: race.state
        });

        // Notify other players in the race
        socket.to(race.id).emit('playerJoined', player);

        // If second real player joined, cancel bot timer and add bots immediately
        const realPlayers = race.players.filter(p => !p.isBot);
        if (realPlayers.length >= 2 && race.botTimer) {
            clearTimeout(race.botTimer);
            race.botTimer = null;
            addBotsToRace(race, race.targetWPM);
        }

        // Start countdown if race is full
        if (race.players.length === 5 && race.state === 'waiting') {
            startCountdown(race);
        }
    });

    // Handle color change
    socket.on('changeColor', async (data) => {
        const player = players.get(socket.id);
        if (player && authenticatedUser) {
            player.color = data.color;
            await database.updateUserColor(authenticatedUser, data.color);

            const race = races.get(player.raceId);
            if (race) {
                io.to(race.id).emit('playerColorChanged', {
                    id: socket.id,
                    color: data.color
                });
            }
        }
    });

    // Handle typing progress
    socket.on('typing', (data) => {
        const player = players.get(socket.id);
        if (!player) return;

        const race = races.get(player.raceId);
        if (!race || race.state !== 'racing') return;

        player.currentWord = data.currentWord;
        player.isTyping = data.isTyping;
        player.progress = data.progress || 0;
        // Only update z coordinate, preserve x (lane position)
        player.position.z = -50 + player.progress;

        socket.to(race.id).emit('playerTyping', {
            id: socket.id,
            currentWord: data.currentWord,
            isTyping: data.isTyping,
            progress: data.progress,
            position: player.position
        });
    });

    // Handle race completion
    socket.on('raceComplete', async (data) => {
        const player = players.get(socket.id);
        if (!player) return;

        const race = races.get(player.raceId);
        if (!race) return;

        player.progress = 100;
        player.score = data.score || 0;

        // Add to finishing order
        race.finishingOrder.push({
            id: socket.id,
            username: player.username,
            score: player.score
        });

        const position = race.finishingOrder.length;

        io.to(race.id).emit('raceFinished', {
            id: socket.id,
            username: player.username,
            score: player.score,
            position: position
        });

        // Update database stats
        if (authenticatedUser && data.wpm) {
            const result = await database.updateUserStats(authenticatedUser, {
                score: player.score,
                totalRaces: 1,
                wpm: data.wpm,
                accuracy: data.accuracy || 100,
                wins: position === 1 ? 1 : 0,
                position: position // Store the finishing position (1st, 2nd, 3rd, etc.)
            });

            // Send updated user stats back to the player
            if (result.success) {
                socket.emit('userStatsUpdated', result.user);
            }
        }

        // Check if all players finished
        checkRaceCompletion(race);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const player = players.get(socket.id);
        if (player && player.raceId) {
            const race = races.get(player.raceId);
            if (race) {
                race.players = race.players.filter(p => p.id !== socket.id);
                socket.to(race.id).emit('playerLeft', socket.id);

                // Cancel race if no human players left
                const humanPlayers = race.players.filter(p => !p.isBot);
                if (humanPlayers.length === 0) {
                    resetRace(race.id);
                }
            }
        }

        players.delete(socket.id);
    });
});

// Connect to database and start server
database.connect().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
});
