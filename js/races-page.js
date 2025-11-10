// Races page functionality
let currentUser = null;
let raceHistory = [];
let currentPage = 0;
let totalRaces = 0;
let hasMore = false;
const RACES_PER_PAGE = 50;

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
            await loadRaceHistory();
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

// Load race history from server
async function loadRaceHistory(page = 0) {
    try {
        const offset = page * RACES_PER_PAGE;
        const response = await fetch(`/api/raceHistory/${currentUser.username}?limit=${RACES_PER_PAGE}&offset=${offset}`);
        const data = await response.json();

        if (data.success) {
            raceHistory = data.races;
            totalRaces = data.total;
            hasMore = data.hasMore;
            currentPage = page;
        } else {
            console.error('Error loading race history:', data.error);
            raceHistory = [];
            totalRaces = 0;
            hasMore = false;
        }
    } catch (error) {
        console.error('Error fetching race history:', error);
        raceHistory = [];
        totalRaces = 0;
        hasMore = false;
    }
}

// Initialize page with user data and race history
function initializePage() {
    // Display username
    document.getElementById('usernameDisplay').textContent = currentUser.username;

    // Display summary stats
    document.getElementById('totalRaces').textContent = totalRaces;
    document.getElementById('avgWpm').textContent = Math.round(currentUser.averageWPM || 0);

    // Calculate best WPM from race history
    const bestWpm = raceHistory.length > 0
        ? Math.max(...raceHistory.map(race => race.wpm))
        : 0;
    document.getElementById('bestWpm').textContent = bestWpm;

    // Calculate place finish counts (need to fetch all races for accurate count)
    calculatePlaceFinishes();

    // Hide loading and show appropriate content
    document.getElementById('loading').style.display = 'none';

    if (totalRaces === 0) {
        // Show empty state
        document.getElementById('racesTable').style.display = 'none';
        document.getElementById('pagination').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
    } else {
        // Show races table
        document.getElementById('racesTable').style.display = 'block';
        document.getElementById('pagination').style.display = 'flex';
        document.getElementById('emptyState').style.display = 'none';
        displayRaces();
        updatePaginationButtons();
    }

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '/home.html';
    });

    // Pagination buttons
    document.getElementById('prevBtn').addEventListener('click', async () => {
        if (currentPage > 0) {
            await loadRaceHistory(currentPage - 1);
            displayRaces();
            updatePaginationButtons();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', async () => {
        if (hasMore) {
            await loadRaceHistory(currentPage + 1);
            displayRaces();
            updatePaginationButtons();
        }
    });

    // Start Racing button in empty state
    const startRacingBtn = document.getElementById('startRacingBtn');
    if (startRacingBtn) {
        startRacingBtn.addEventListener('click', () => {
            window.location.href = '/race.html';
        });
    }
}

// Display races in the table
function displayRaces() {
    const racesList = document.getElementById('racesList');
    racesList.innerHTML = '';

    // Find the best WPM to highlight
    const bestWpm = Math.max(...raceHistory.map(race => race.wpm));

    raceHistory.forEach(race => {
        const raceRow = document.createElement('div');
        raceRow.className = 'race-row';

        // Add special class for best WPM
        if (race.wpm === bestWpm) {
            raceRow.classList.add('best-wpm');
        }

        // Format date
        const date = new Date(race.timestamp);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format position (1st, 2nd, 3rd, etc.)
        let positionStr = '-';
        if (race.position) {
            const lastDigit = race.position % 10;
            const lastTwoDigits = race.position % 100;
            // Handle 11th, 12th, 13th specially, then 1st, 2nd, 3rd for other numbers
            const suffix = (lastTwoDigits >= 11 && lastTwoDigits <= 13)
                ? 'th'
                : (lastDigit === 1 ? 'st' : lastDigit === 2 ? 'nd' : lastDigit === 3 ? 'rd' : 'th');
            positionStr = `${race.position}${suffix}`;
        }

        raceRow.innerHTML = `
            <div class="col-date">
                <span class="date-text">${dateStr}</span>
                <span class="time-text">${timeStr}</span>
            </div>
            <div class="col-position">
                <span class="position-value ${race.position <= 3 ? 'top-three' : ''}">${positionStr}</span>
                ${race.position === 1 ? '<span class="medal">🥇</span>' : ''}
                ${race.position === 2 ? '<span class="medal">🥈</span>' : ''}
                ${race.position === 3 ? '<span class="medal">🥉</span>' : ''}
            </div>
            <div class="col-wpm">
                <span class="wpm-value">${race.wpm}</span>
                ${race.wpm === bestWpm ? '<span class="best-badge">🏆</span>' : ''}
            </div>
            <div class="col-accuracy">
                <span class="accuracy-value">${race.accuracy}%</span>
            </div>
        `;

        racesList.appendChild(raceRow);
    });
}

// Update pagination button states
function updatePaginationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');

    // Update button states
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = !hasMore;

    // Update page info
    const startRace = currentPage * RACES_PER_PAGE + 1;
    const endRace = Math.min((currentPage + 1) * RACES_PER_PAGE, totalRaces);
    pageInfo.textContent = `Showing ${startRace}-${endRace} of ${totalRaces}`;
}

// Calculate place finish counts from all race history
async function calculatePlaceFinishes() {
    try {
        // Fetch all races (no pagination) to get accurate counts
        const response = await fetch(`/api/raceHistory/${currentUser.username}`);
        const data = await response.json();

        if (data.success && data.races) {
            const allRaces = data.races;

            // Count 1st, 2nd, and 3rd place finishes
            const firstPlaceCount = allRaces.filter(race => race.position === 1).length;
            const secondPlaceCount = allRaces.filter(race => race.position === 2).length;
            const thirdPlaceCount = allRaces.filter(race => race.position === 3).length;

            // Update the display
            document.getElementById('firstPlace').textContent = firstPlaceCount;
            document.getElementById('secondPlace').textContent = secondPlaceCount;
            document.getElementById('thirdPlace').textContent = thirdPlaceCount;
        }
    } catch (error) {
        console.error('Error calculating place finishes:', error);
        // Set to 0 on error
        document.getElementById('firstPlace').textContent = 0;
        document.getElementById('secondPlace').textContent = 0;
        document.getElementById('thirdPlace').textContent = 0;
    }
}
