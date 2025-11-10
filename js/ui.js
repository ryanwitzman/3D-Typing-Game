// UI Update Functions

// Display text with cursor
function displayText(text) {
    const phraseEl = document.getElementById('phrase');
    phraseEl.innerHTML = text.split('').map((char, i) => {
        const classes = [];
        if (i === currentIndex) classes.push('cursor');
        if (i < currentIndex) classes.push('correct');
        return `<span class="char ${classes.join(' ')}" data-index="${i}">${char === ' ' ? '&nbsp;' : char}</span>`;
    }).join('');
}

// Update display (refresh cursor and correct/error states)
function updateDisplay() {
    const chars = document.querySelectorAll('.char');
    const phraseEl = document.getElementById('phrase');

    chars.forEach((char, i) => {
        char.className = 'char';

        if (i < currentIndex) {
            char.classList.add('correct');
        } else if (i === currentIndex) {
            char.classList.add('cursor');
            if (hasError) {
                char.classList.add('error');
            }

            // Auto-scroll to keep cursor in view
            const cursorRect = char.getBoundingClientRect();
            const phraseRect = phraseEl.getBoundingClientRect();
            const scrollOffset = phraseEl.scrollLeft;

            // Calculate ideal scroll position (keep cursor centered)
            const cursorRelativePos = cursorRect.left - phraseRect.left + scrollOffset;
            const targetScroll = cursorRelativePos - (phraseRect.width / 3);

            phraseEl.scrollLeft = Math.max(0, targetScroll);
        }
    });
}

// Update scoreboard
function updateScoreboard() {
    const playerList = document.getElementById('playerList');

    // Sort players by finishing position first, then by progress
    const sortedPlayers = Array.from(playerData.entries())
        .sort((a, b) => {
            const aFinishPos = finishingPositions.get(a[0]);
            const bFinishPos = finishingPositions.get(b[0]);

            // If both have finishing positions, sort by finishing position (lower is better)
            if (aFinishPos !== undefined && bFinishPos !== undefined) {
                return aFinishPos - bFinishPos;
            }

            // If only one has finished, they come first
            if (aFinishPos !== undefined) return -1;
            if (bFinishPos !== undefined) return 1;

            // Neither has finished, sort by progress (higher is better)
            return (b[1].progress || 0) - (a[1].progress || 0);
        });

    playerList.innerHTML = sortedPlayers
        .map(([id, data], index) => {
            const botBadge = data.isBot ? '<span class="bot-badge">BOT</span>' : '';
            const position = index + 1;

            // Check if this player has finished and get their finishing position
            const finishPosition = finishingPositions.get(id);
            const finishBadge = finishPosition
                ? `<span class="finish-badge">${getOrdinalSuffix(finishPosition)}</span>`
                : '';

            return `
                <div class="player-score">
                    <span class="name">
                        ${position}. ${data.username} ${botBadge}
                    </span>
                    <span class="progress-text">${Math.round(data.progress || 0)}% ${finishBadge}</span>
                </div>
            `;
        }).join('');
}
