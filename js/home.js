// Home page functionality
let currentUser = null;
let selectedColor = null;

// Check authentication on page load
window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Verify token and get user data
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            initializePage();
        } else {
            // Invalid token, redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Verification error:', error);
        window.location.href = '/login.html';
    }
});

// Initialize page with user data
function initializePage() {
    // Display username
    document.getElementById('usernameDisplay').textContent = currentUser.username;

    // Display stats
    document.getElementById('avgWpm').textContent = currentUser.averageWPM || 0;
    document.getElementById('highScore').textContent = currentUser.highScore || 0;
    document.getElementById('totalRaces').textContent = currentUser.totalRaces || 0;

    // Set selected color
    selectedColor = currentUser.color || '#FF6B6B';

    // Highlight selected color
    document.querySelectorAll('.home-color-option').forEach(option => {
        if (option.dataset.color === selectedColor) {
            option.classList.add('selected');
        }
    });

    // Add color selection listeners
    document.querySelectorAll('.home-color-option').forEach(option => {
        option.addEventListener('click', async () => {
            const newColor = option.dataset.color;

            // Update UI
            document.querySelectorAll('.home-color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');

            // Update selected color
            selectedColor = newColor;

            // Save to server
            try {
                await fetch('/api/changeColor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: currentUser.username,
                        color: newColor
                    })
                });
            } catch (error) {
                console.error('Error changing color:', error);
            }
        });
    });

    // Start racing button
    document.getElementById('startRaceBtn').addEventListener('click', () => {
        // Navigate to race page
        window.location.href = '/race.html';
    });

    // View races button
    document.getElementById('viewRacesBtn').addEventListener('click', () => {
        // Navigate to races page
        window.location.href = '/races.html';
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    });
}
