// Game State Management and Socket.io Communication

// Get current user from localStorage
const authToken = localStorage.getItem('authToken');
let currentUser = null;

// Socket.io connection
let socket;
let playerId = null;

// Game state variables
let currentText = '';
let currentIndex = 0; // Cursor position
let startTime = null;
let correctChars = 0;
let totalKeyPresses = 0;
let raceState = 'waiting';
let hasError = false; // Track if current position has an error

// Player data storage
const playerData = new Map();
const finishingPositions = new Map(); // Track finishing positions for display

// DOM elements
const typingArea = document.getElementById('typingArea');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const waitingMessage = document.getElementById('waitingMessage');

// Fetch current user data
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: authToken })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            initGame();
        } else {
            // Invalid token, redirect to login
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Failed to verify token:', error);
        window.location.href = '/login.html';
    }
}

// Initialize game
function initGame() {
    // Display user info
    document.getElementById('raceUsername').textContent = currentUser.username;

    // Display user progress stats
    document.getElementById('userAvgWpm').textContent = Math.round(currentUser.averageWPM || 0);
    document.getElementById('userTotalRaces').textContent = currentUser.totalRaces || 0;
    document.getElementById('userHighScore').textContent = currentUser.highScore || 0;

    // Add leave race button listener
    document.getElementById('leaveRaceBtn').addEventListener('click', () => {
        window.location.href = '/home.html';
    });

    // Initialize socket connection
    socket = io();

    // Authenticate with server
    socket.emit('authenticate', { username: currentUser.username });

    // Initialize game
    socket.on('init', (data) => {
        playerId = data.playerId;
        currentText = data.text;
        raceState = data.raceState;
        displayText(currentText);

        // Find my player data to get the correct lane position
        const myPlayerData = data.players.find(p => p.id === playerId);
        const myLaneX = myPlayerData ? myPlayerData.position.x : 0;

        // Create my car
        myCarMesh = createCarMesh(currentUser.color || '#FF6B6B');
        myCarMesh.position.set(myLaneX, 0.5, -50);
        scene.add(myCarMesh);
        playerMeshes.set(playerId, myCarMesh);
        playerData.set(playerId, { progress: 0, username: currentUser.username, isBot: false });

        // Add existing players
        data.players.forEach(player => {
            if (player.id !== playerId) {
                addPlayer(player);
            }
        });

        // Show waiting message if not enough players
        if (data.players.length < 5) {
            waitingMessage.classList.add('show');
        }

        updateScoreboard();
    });

    // Player joined
    socket.on('playerJoined', (player) => {
        addPlayer(player);
        updateScoreboard();
        waitingMessage.classList.remove('show');
    });

    // Player left
    socket.on('playerLeft', (id) => {
        const mesh = playerMeshes.get(id);
        if (mesh) {
            scene.remove(mesh);
            playerMeshes.delete(id);
            playerData.delete(id);
        }
        updateScoreboard();
    });

    // Countdown
    socket.on('raceCountdown', (data) => {
        raceState = 'countdown';
        waitingMessage.classList.remove('show');
        countdownOverlay.classList.add('show');
        countdownNumber.textContent = data.countdown;

        if (data.countdown === 0) {
            countdownNumber.textContent = 'GO!';
            setTimeout(() => {
                countdownOverlay.classList.remove('show');
            }, 500);
        }
    });

    // Race start
    socket.on('raceStart', () => {
        raceState = 'racing';
        typingArea.classList.remove('disabled');
        startTime = Date.now();
    });

    // Player typing progress
    socket.on('playerTyping', (data) => {
        const mesh = playerMeshes.get(data.id);
        if (mesh && data.position) {
            // Only update z position to preserve lane assignment (x position)
            mesh.position.z = data.position.z;
        }

        const pData = playerData.get(data.id);
        if (pData) {
            pData.progress = data.progress || 0;
        }

        updateScoreboard();
    });

    // Player color changed
    socket.on('playerColorChanged', (data) => {
        const mesh = playerMeshes.get(data.id);
        if (mesh) {
            mesh.children.forEach(child => {
                if (child.material && (child.geometry.type === 'BoxGeometry')) {
                    child.material.color.setStyle(data.color);
                }
            });
        }
    });

    // Race finished
    socket.on('raceFinished', (data) => {
        // Store finishing position for all players
        finishingPositions.set(data.id, data.position);

        // Update scoreboard to show positions
        updateScoreboard();

        // Only show banner if the current user finished
        if (data.id === playerId) {
            const banner = document.getElementById('raceFinishBanner');
            const winnerName = document.getElementById('winnerName');

            // Format position with ordinal suffix (1st, 2nd, 3rd, etc.)
            const positionText = getOrdinalSuffix(data.position);
            winnerName.textContent = `You finished in ${positionText} place!`;

            banner.classList.add('show');
            // Banner stays visible - no timeout to remove it
        }
    });

    // Race reset
    socket.on('raceReset', () => {
        window.location.reload();
    });

    // New race button handler
    document.getElementById('newRaceBtn').addEventListener('click', () => {
        window.location.reload();
    });

    // User stats updated
    socket.on('userStatsUpdated', (updatedUser) => {
        currentUser = updatedUser;
        document.getElementById('userAvgWpm').textContent = Math.round(updatedUser.averageWPM || 0);
        document.getElementById('userTotalRaces').textContent = updatedUser.totalRaces || 0;
        document.getElementById('userHighScore').textContent = updatedUser.highScore || 0;
    });
}

// Add player to scene
function addPlayer(player) {
    const mesh = createCarMesh(player.color || '#FF6B6B');
    mesh.position.set(player.position.x, player.position.y, player.position.z);
    scene.add(mesh);
    playerMeshes.set(player.id, mesh);
    playerData.set(player.id, {
        progress: player.progress || 0,
        username: player.username,
        isBot: player.isBot || false
    });
}

// Complete race
function completeRace() {
    if (raceState !== 'racing') return;

    const timeElapsed = (Date.now() - startTime) / 1000;
    const wpm = Math.round((currentText.length / 5) / (timeElapsed / 60));
    const score = Math.round((currentText.length / timeElapsed) * 10);
    const accuracy = totalKeyPresses > 0 ? Math.round((correctChars / totalKeyPresses) * 100) : 100;

    raceState = 'finished';
    typingArea.classList.add('disabled');

    if (socket) {
        socket.emit('raceComplete', {
            score: score,
            wpm: wpm,
            accuracy: accuracy,
            position: 1
        });
    }
}

// Update stats
function updateStats() {
    if (startTime) {
        const timeElapsed = (Date.now() - startTime) / 1000 / 60;
        const wordsTyped = currentIndex / 5; // Average 5 chars per word
        const wpm = Math.round(wordsTyped / timeElapsed) || 0;
        document.getElementById('wpm').textContent = wpm;
    }

    const accuracy = totalKeyPresses > 0 ? Math.round((correctChars / totalKeyPresses) * 100) : 100;
    document.getElementById('accuracy').textContent = accuracy + '%';
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
        return num + "st";
    }
    if (j === 2 && k !== 12) {
        return num + "nd";
    }
    if (j === 3 && k !== 13) {
        return num + "rd";
    }
    return num + "th";
}

// Start loading user when page loads
if (authToken) {
    loadCurrentUser();
} else {
    window.location.href = '/login.html';
}
