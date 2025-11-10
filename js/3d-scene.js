// Three.js Scene Setup and 3D Objects

// Scene, camera, renderer
const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / (window.innerHeight * 0.7), 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });

const canvasHeight = window.innerHeight * 0.7;
renderer.setSize(window.innerWidth, canvasHeight);
renderer.setClearColor(0x1a1a2e);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Add fog for depth and atmosphere
scene.fog = new THREE.Fog(0x1a1a2e, 30, 100);

// Lighting
const ambientLight = new THREE.AmbientLight(0x6a5acd, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 30, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add neon-style accent lights
const neonLight1 = new THREE.PointLight(0x00ffff, 1, 50);
neonLight1.position.set(-10, 3, 0);
scene.add(neonLight1);

const neonLight2 = new THREE.PointLight(0xff00ff, 1, 50);
neonLight2.position.set(10, 3, 0);
scene.add(neonLight2);

// Add a rim light for dramatic effect
const rimLight = new THREE.DirectionalLight(0x4ECDC4, 0.5);
rimLight.position.set(-10, 5, -10);
scene.add(rimLight);

// Create racing track
function createTrack() {
    const trackGroup = new THREE.Group();

    // Main track surface with reflective material
    const trackGeometry = new THREE.BoxGeometry(18, 0.3, 120);
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.3,
        roughness: 0.7
    });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.receiveShadow = true;
    trackGroup.add(track);

    // Neon lane lines with glow effect
    for (let i = -50; i < 60; i += 8) {
        const lineGeometry = new THREE.BoxGeometry(0.4, 0.31, 3);
        const lineMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, 0, i);
        trackGroup.add(line);
    }

    // Side barriers with neon strips
    const barrierGeometry = new THREE.BoxGeometry(0.5, 2.5, 120);
    const barrierMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.8,
        roughness: 0.2
    });

    const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    leftBarrier.position.set(-9.5, 1.25, 0);
    leftBarrier.castShadow = true;
    trackGroup.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    rightBarrier.position.set(9.5, 1.25, 0);
    rightBarrier.castShadow = true;
    trackGroup.add(rightBarrier);

    // Neon strips on barriers
    for (let i = -50; i < 60; i += 15) {
        // Left barrier neon
        const neonGeometry = new THREE.BoxGeometry(0.1, 0.3, 2);
        const neonMaterial = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.8
        });
        const leftNeon = new THREE.Mesh(neonGeometry, neonMaterial);
        leftNeon.position.set(-9.3, 1.5, i);
        trackGroup.add(leftNeon);

        // Right barrier neon
        const rightNeon = new THREE.Mesh(neonGeometry, neonMaterial);
        rightNeon.position.set(9.3, 1.5, i);
        trackGroup.add(rightNeon);
    }

    // Checkered flag at finish line with better design
    const flagGeometry = new THREE.PlaneGeometry(12, 6);
    const flagTexture = createCheckeredTexture();
    const flagMaterial = new THREE.MeshBasicMaterial({
        map: flagTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
    });
    const flag = new THREE.Mesh(flagGeometry, flagMaterial);
    flag.position.set(0, 6, 60);
    trackGroup.add(flag);

    // Flag pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 12, 16);
    const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.9,
        roughness: 0.1
    });
    const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
    leftPole.position.set(-6, 6, 60);
    trackGroup.add(leftPole);

    const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
    rightPole.position.set(6, 6, 60);
    trackGroup.add(rightPole);

    // Ground with grid pattern
    const groundGeometry = new THREE.PlaneGeometry(120, 160);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a1a,
        metalness: 0.2,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    trackGroup.add(ground);

    // Add grid lines to ground
    for (let i = -60; i < 80; i += 10) {
        const gridLineGeometry = new THREE.PlaneGeometry(0.1, 160);
        const gridLineMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a3a,
            transparent: true,
            opacity: 0.3
        });
        const gridLine = new THREE.Mesh(gridLineGeometry, gridLineMaterial);
        gridLine.rotation.x = -Math.PI / 2;
        gridLine.position.set(i, -0.1, 0);
        trackGroup.add(gridLine);
    }

    for (let i = -70; i < 90; i += 10) {
        const gridLineGeometry = new THREE.PlaneGeometry(120, 0.1);
        const gridLineMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a3a,
            transparent: true,
            opacity: 0.3
        });
        const gridLine = new THREE.Mesh(gridLineGeometry, gridLineMaterial);
        gridLine.rotation.x = -Math.PI / 2;
        gridLine.position.set(0, -0.1, i);
        trackGroup.add(gridLine);
    }

    // Add starting line
    const startLineGeometry = new THREE.BoxGeometry(18, 0.31, 1);
    const startLineMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
    });
    const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLine.position.set(0, 0, -50);
    trackGroup.add(startLine);

    // Add distance markers along the track
    for (let i = -40; i < 60; i += 20) {
        const markerGeometry = new THREE.BoxGeometry(1, 0.32, 0.5);
        const markerMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 0.4
        });
        const leftMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        leftMarker.position.set(-9, 0, i);
        trackGroup.add(leftMarker);

        const rightMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        rightMarker.position.set(9, 0, i);
        trackGroup.add(rightMarker);
    }

    return trackGroup;
}

// Create checkered flag texture
function createCheckeredTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const squareSize = 64;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#000000' : '#ffffff';
            ctx.fillRect(i * squareSize, j * squareSize, squareSize, squareSize);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create car mesh
function createCarMesh(color) {
    const carGroup = new THREE.Group();

    // Main car body (sleeker, lower profile)
    const bodyGeometry = new THREE.BoxGeometry(2.2, 0.8, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.6,
        roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.position.y = 0.6;
    carGroup.add(body);

    // Front nose (aerodynamic)
    const noseGeometry = new THREE.BoxGeometry(1.8, 0.6, 0.8);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.castShadow = true;
    nose.position.set(0, 0.5, 2.4);
    carGroup.add(nose);

    // Cockpit/cabin (sleeker design)
    const cockpitGeometry = new THREE.BoxGeometry(1.6, 0.9, 2);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.7,
        roughness: 0.3
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.castShadow = true;
    cockpit.position.set(0, 1.25, 0);
    carGroup.add(cockpit);

    // Windshield (dark glass)
    const windshieldGeometry = new THREE.BoxGeometry(1.5, 0.7, 1);
    const windshieldMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0, 1.3, 0.8);
    carGroup.add(windshield);

    // Rear spoiler
    const spoilerBaseGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.2);
    const spoilerBaseMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const spoilerBase1 = new THREE.Mesh(spoilerBaseGeometry, spoilerBaseMaterial);
    spoilerBase1.position.set(-0.7, 1.4, -2);
    carGroup.add(spoilerBase1);

    const spoilerBase2 = new THREE.Mesh(spoilerBaseGeometry, spoilerBaseMaterial);
    spoilerBase2.position.set(0.7, 1.4, -2);
    carGroup.add(spoilerBase2);

    const spoilerWingGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
    const spoilerWing = new THREE.Mesh(spoilerWingGeometry, spoilerBaseMaterial);
    spoilerWing.castShadow = true;
    spoilerWing.position.set(0, 1.8, -2);
    carGroup.add(spoilerWing);

    // Headlights
    const headlightGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffaa,
        emissive: 0xffff00,
        emissiveIntensity: 0.5
    });

    const headlight1 = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight1.position.set(-0.6, 0.5, 2.8);
    carGroup.add(headlight1);

    const headlight2 = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlight2.position.set(0.6, 0.5, 2.8);
    carGroup.add(headlight2);

    // Taillights
    const taillightGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.3
    });

    const taillight1 = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillight1.position.set(-0.7, 0.6, -2);
    carGroup.add(taillight1);

    const taillight2 = new THREE.Mesh(taillightGeometry, taillightMaterial);
    taillight2.position.set(0.7, 0.6, -2);
    carGroup.add(taillight2);

    // Wheels (larger, more detailed)
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.3
    });

    // Rim detail
    const rimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.41, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.9,
        roughness: 0.2
    });

    const wheelPositions = [
        [-1.3, 0.5, 1.5],
        [1.3, 0.5, 1.5],
        [-1.3, 0.5, -1.3],
        [1.3, 0.5, -1.3]
    ];

    wheelPositions.forEach(pos => {
        // Wheel
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        carGroup.add(wheel);

        // Rim
        const rim = new THREE.Mesh(rimGeometry, rimMaterial);
        rim.rotation.z = Math.PI / 2;
        rim.position.set(...pos);
        carGroup.add(rim);
    });

    // Side mirrors
    const mirrorGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.3);
    const mirrorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const mirror1 = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
    mirror1.position.set(-1.2, 1.4, 0.5);
    carGroup.add(mirror1);

    const mirror2 = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
    mirror2.position.set(1.2, 1.4, 0.5);
    carGroup.add(mirror2);

    // Exhaust pipes
    const exhaustGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16);
    const exhaustMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.3
    });

    const exhaust1 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust1.rotation.x = Math.PI / 2;
    exhaust1.position.set(-0.5, 0.4, -2.2);
    carGroup.add(exhaust1);

    const exhaust2 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    exhaust2.rotation.x = Math.PI / 2;
    exhaust2.position.set(0.5, 0.4, -2.2);
    carGroup.add(exhaust2);

    return carGroup;
}

// Initialize track
const track = createTrack();
scene.add(track);

// Camera position - higher and further back for better view of all cars
camera.position.set(0, 18, -60);
camera.lookAt(0, 0, 0);

// Wider field of view for better peripheral vision
camera.fov = 75;
camera.updateProjectionMatrix();

// Player cars storage
const playerMeshes = new Map();
let myCarMesh = null;

// Particle system for exhaust trails
const exhaustParticles = [];

function createExhaustParticle(car) {
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.6
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position behind the car
    particle.position.set(
        car.position.x + (Math.random() - 0.5) * 0.5,
        car.position.y + 0.3,
        car.position.z - 2.5
    );

    particle.life = 1.0; // Lifetime of particle
    particle.velocity = -0.2; // Move backwards

    scene.add(particle);
    exhaustParticles.push(particle);
}

function updateExhaustParticles() {
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
        const particle = exhaustParticles[i];
        particle.life -= 0.02;
        particle.position.z += particle.velocity;
        particle.material.opacity = particle.life * 0.6;
        particle.scale.set(particle.life, particle.life, particle.life);

        if (particle.life <= 0) {
            scene.remove(particle);
            exhaustParticles.splice(i, 1);
        }
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    const canvasHeight = window.innerHeight * 0.7;
    camera.aspect = window.innerWidth / canvasHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, canvasHeight);
});
