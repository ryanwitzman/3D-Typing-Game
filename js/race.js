// Main Race Coordination and Input Handling

// Track last keystroke time for speed boost effect
let lastKeystrokeTime = 0;
let consecutiveCorrectChars = 0;

// Input handling - CURSOR BASED (Document level, no input box)
document.addEventListener('keydown', (e) => {
    if (raceState !== 'racing') return;

    // Prevent default for space to avoid scrolling
    if (e.key === ' ') {
        e.preventDefault();
    }

    // Ignore backspace, arrow keys, and other non-character keys
    if (e.key === 'Backspace' || e.key.length > 1) {
        e.preventDefault();
        return;
    }

    // Only accept single character keys
    if (e.key.length === 1) {
        totalKeyPresses++;

        // Check if typed character matches
        if (e.key === currentText[currentIndex]) {
            // Correct character
            correctChars++;
            currentIndex++;
            hasError = false; // Clear error state
            consecutiveCorrectChars++;

            // Calculate progress
            const progress = (currentIndex / currentText.length) * 100;
            document.getElementById('progressFill').style.width = progress + '%';
            document.getElementById('progress').textContent = Math.round(progress) + '%';

            // Update my car position (only z coordinate, preserve x for lane)
            if (myCarMesh) {
                myCarMesh.position.z = -50 + progress;
            }

            // Update local player data for scoreboard
            const myData = playerData.get(playerId);
            if (myData) {
                myData.progress = progress;
            }

            // Update stats
            updateStats();

            // Check for speed boost effect (typing fast)
            const now = Date.now();
            if (now - lastKeystrokeTime < 100 && consecutiveCorrectChars >= 5) {
                triggerSpeedBoost();
            }
            lastKeystrokeTime = now;

            // Send typing progress
            if (socket) {
                socket.emit('typing', {
                    currentWord: currentText.substring(0, currentIndex),
                    isTyping: true,
                    progress: progress
                });
            }

            // Update scoreboard with new progress
            updateScoreboard();

            // Check completion
            if (currentIndex >= currentText.length) {
                completeRace();
            }

            updateDisplay();
        } else {
            // Wrong character - cursor stays in place and turns red
            hasError = true;
            consecutiveCorrectChars = 0;

            updateDisplay();
        }
    }
});

// Speed boost visual effect
function triggerSpeedBoost() {
    const canvas = document.getElementById('gameCanvas');
    canvas.classList.add('speed-boost');
    setTimeout(() => {
        canvas.classList.remove('speed-boost');
    }, 300);
}

// Animation loop
let frameCount = 0;

function animate() {
    requestAnimationFrame(animate);
    frameCount++;

    // Update camera to follow player with smooth tracking and better field of view
    if (myCarMesh) {
        // Target camera position - higher and further back for better visibility
        const targetZ = myCarMesh.position.z - 15;
        const targetY = 18;
        const targetX = 0;

        // Smooth camera movement (lerp) for cinematic feel
        camera.position.z += (targetZ - camera.position.z) * 0.08;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        camera.position.x += (targetX - camera.position.x) * 0.1;

        // Look ahead of the car, allowing view of cars both ahead and behind
        const lookAtZ = myCarMesh.position.z + 20;
        const lookAtY = 2;
        camera.lookAt(0, lookAtY, lookAtZ);

        // Create exhaust particles during race (every 3 frames for all cars)
        if (raceState === 'racing' && frameCount % 3 === 0) {
            playerMeshes.forEach((carMesh) => {
                createExhaustParticle(carMesh);
            });
        }

        // Add subtle car bounce animation during movement
        if (raceState === 'racing' && consecutiveCorrectChars > 0) {
            const bounce = Math.sin(Date.now() * 0.01) * 0.05;
            myCarMesh.position.y = 0.5 + bounce;
        }
    }

    // Update exhaust particles
    updateExhaustParticles();

    // Animate neon lights for dynamic effect
    const time = Date.now() * 0.001;
    if (neonLight1) {
        neonLight1.intensity = 1 + Math.sin(time * 2) * 0.3;
        neonLight1.position.z = camera.position.z;
    }
    if (neonLight2) {
        neonLight2.intensity = 1 + Math.cos(time * 2) * 0.3;
        neonLight2.position.z = camera.position.z;
    }

    renderer.render(scene, camera);
}

// Start animation loop
animate();
