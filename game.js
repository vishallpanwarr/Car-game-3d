// Main Game Controller: Three.js Setup, Post-Processing Bloom, Camera Dynamics & Game Loop
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

import { SuperCar } from './car.js';
import { TrackSystem } from './track.js';
import { SoundEngine } from './audio.js';
import { TypingEngine } from './typing.js';

export class TurboTypeGame {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.clock = new THREE.Clock();

        // Game Settings & State
        this.gameMode = 'typing'; // 'typing' | 'arcade' | 'hybrid'
        this.isPlaying = false;
        this.isPaused = false;
        this.cameraViewIndex = 0; // 0: Chase, 1: Hood, 2: Bumper, 3: Drone
        this.cameraViews = ['CHASE', 'HOOD', 'BUMPER', 'DRONE'];
        this.graphicsQuality = 'ultra'; // 'ultra' | 'high' | 'perf'

        // Input state
        this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            handbrake: false,
            nitro: false
        };

        // Systems
        this.soundEngine = new SoundEngine();
        this.typingEngine = new TypingEngine(this.soundEngine);

        // Core Three.js Objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.bloomPass = null;

        // Game Entities
        this.playerCar = null;
        this.trackSystem = null;

        // Minimap
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        // UI references
        this.ui = {
            speedValue: document.getElementById('speed-value'),
            gearValue: document.getElementById('gear-value'),
            rpmValue: document.getElementById('rpm-value'),
            rpmBar: document.getElementById('rpm-bar-fill'),
            nitroBar: document.getElementById('nitro-bar-fill'),
            racePos: document.getElementById('race-position'),
            wpmValue: document.getElementById('wpm-display'),
            accuracyValue: document.getElementById('accuracy-display'),
            streakValue: document.getElementById('streak-display'),
            typingCard: document.getElementById('typing-prompt-card'),
            typingWord: document.getElementById('typing-target-word'),
            typingQueue: document.getElementById('typing-queue-preview'),
            overtakeBanner: document.getElementById('overtake-banner'),
            cameraLabel: document.getElementById('camera-mode-label')
        };

        this.initThree();
        this.initPostProcessing();
        this.initWorld();
        this.bindEvents();
        this.animate();
    }

    initThree() {
        // Scene with dark cyber-atmospheric fog
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x060810);
        this.scene.fog = new THREE.FogExp2(0x060810, 0.005);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            68,
            window.innerWidth / window.innerHeight,
            0.1,
            1200
        );

        // WebGL Renderer with High-DPI support
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 4K crisp rendering
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x2a354d, 1.2);
        this.scene.add(ambientLight);

        const moonLight = new THREE.DirectionalLight(0x7faaff, 1.8);
        moonLight.position.set(40, 100, 50);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        this.scene.add(moonLight);
    }

    initPostProcessing() {
        // UnrealBloom for brilliant 4K neon highlights and exhaust glows
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.1,  // Strength
            0.35, // Radius
            0.8   // Threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    initWorld() {
        // Build Track System & Cyber Highway
        this.trackSystem = new TrackSystem(this.scene, { theme: 'cyber' });

        // Player Supercar
        this.playerCar = new SuperCar(this.scene, {
            isAI: false,
            color: 0x00f0ff,
            underglowColor: 0x00f0ff,
            name: 'APEX-ONE',
            x: 0,
            z: 0
        });

        // Spawn AI Rivals ahead
        this.trackSystem.spawnAIRivals(this.playerCar.position.z);
    }

    startGame(mode = 'typing') {
        this.gameMode = mode;
        this.isPlaying = true;
        this.isPaused = false;

        this.soundEngine.init();
        this.soundEngine.resume();
        this.soundEngine.startMusic();

        this.typingEngine.startSession();

        // Update UI visibility
        const typingHud = document.getElementById('typing-hud-container');
        if (typingHud) {
            typingHud.style.display = (mode === 'arcade') ? 'none' : 'flex';
        }

        const arcadeHelp = document.getElementById('arcade-controls-guide');
        if (arcadeHelp) {
            arcadeHelp.style.display = (mode === 'typing') ? 'none' : 'block';
        }

        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('hud-overlay').classList.remove('hidden');
    }

    togglePause() {
        if (!this.isPlaying) return;
        this.isPaused = !this.isPaused;
        const pauseMenu = document.getElementById('pause-modal');
        if (pauseMenu) {
            pauseMenu.classList.toggle('hidden', !this.isPaused);
        }
    }

    cycleCamera() {
        this.cameraViewIndex = (this.cameraViewIndex + 1) % this.cameraViews.length;
        const label = this.cameraViews[this.cameraViewIndex];
        if (this.ui.cameraLabel) {
            this.ui.cameraLabel.textContent = `CAM: ${label}`;
        }
    }

    setGraphicsQuality(quality) {
        this.graphicsQuality = quality;
        if (quality === 'ultra') {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.bloomPass.enabled = true;
            this.bloomPass.strength = 1.1;
        } else if (quality === 'high') {
            this.renderer.setPixelRatio(1);
            this.bloomPass.enabled = true;
            this.bloomPass.strength = 0.7;
        } else {
            // Performance mode
            this.renderer.setPixelRatio(1);
            this.bloomPass.enabled = false;
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.onWindowResize());

        // Keydown handling for driving & typing
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
                return;
            }

            if (e.key === 'c' || e.key === 'C') {
                this.cycleCamera();
                return;
            }

            if (!this.isPlaying || this.isPaused) return;

            // In Arcade or Hybrid Mode: Arrows / WASD control the car
            if (this.gameMode === 'arcade' || this.gameMode === 'hybrid') {
                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.inputState.forward = true;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.inputState.backward = true;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputState.left = true;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputState.right = true;
                if (e.key === ' ') this.inputState.handbrake = true;
                if (e.key === 'Shift') this.inputState.nitro = true;
            }

            // In Typing or Hybrid Mode: Key events are sent to TypingEngine!
            if (this.gameMode === 'typing' || this.gameMode === 'hybrid') {
                // If in hybrid mode, ignore directional keys so they don't count as typos
                if (this.gameMode === 'hybrid' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(e.key)) {
                    return;
                }

                // Discard F-keys, Alt, Ctrl, etc.
                if (e.ctrlKey || e.altKey || e.metaKey) return;

                const result = this.typingEngine.handleKeyInput(e.key, this.playerCar);
                if (result) {
                    if (result.type === 'word_completed') {
                        this.triggerWordFlash();
                    }
                    this.updateTypingUI();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.gameMode === 'arcade' || this.gameMode === 'hybrid') {
                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.inputState.forward = false;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.inputState.backward = false;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputState.left = false;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputState.right = false;
                if (e.key === ' ') this.inputState.handbrake = false;
                if (e.key === 'Shift') this.inputState.nitro = false;
            }
        });
    }

    triggerWordFlash() {
        if (this.ui.typingCard) {
            this.ui.typingCard.classList.remove('word-pulse');
            void this.ui.typingCard.offsetWidth; // trigger reflow
            this.ui.typingCard.classList.add('word-pulse');
        }
    }

    triggerOvertakeBanner(rivalName) {
        if (!this.ui.overtakeBanner) return;
        this.ui.overtakeBanner.textContent = `⚡ OVERTAKEN: ${rivalName}!`;
        this.ui.overtakeBanner.classList.add('visible');
        setTimeout(() => {
            if (this.ui.overtakeBanner) this.ui.overtakeBanner.classList.remove('visible');
        }, 1800);
    }

    updateTypingUI() {
        const data = this.typingEngine.getDisplayData();
        const stats = this.typingEngine.getStats();

        if (this.ui.typingWord) {
            // Render matched characters in neon green, remaining in bright white
            this.ui.typingWord.innerHTML = `
                <span class="matched-text">${data.matched}</span><span class="cursor-bar">|</span><span class="remaining-text">${data.remaining}</span>
            `;
            if (data.hasError) {
                this.ui.typingWord.classList.add('error-shake');
            } else {
                this.ui.typingWord.classList.remove('error-shake');
            }
        }

        if (this.ui.typingQueue) {
            this.ui.typingQueue.innerHTML = data.nextWords.map(w => `<span class="queued-word">${w}</span>`).join(' ');
        }

        if (this.ui.wpmValue) this.ui.wpmValue.textContent = stats.wpm;
        if (this.ui.accuracyValue) this.ui.accuracyValue.textContent = `${stats.accuracy}%`;
        if (this.ui.streakValue) this.ui.streakValue.textContent = `${stats.streak}x`;
    }

    updateCamera(delta) {
        if (!this.playerCar) return;

        const carPos = this.playerCar.position;
        const carRotY = this.playerCar.rotation.y;
        const speed = this.playerCar.speed;

        // Dynamic FOV warp: camera widens at extreme speeds
        const targetFOV = 68 + Math.min(speed / 90, 1.0) * 22;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.1);
        this.camera.updateProjectionMatrix();

        if (this.cameraViewIndex === 0) {
            // 0: Dynamic 3rd-Person Chase Cam
            const distance = 8.2 + Math.min(speed / 80, 1.0) * 2.5;
            const height = 3.4;

            const targetCamPos = new THREE.Vector3(
                carPos.x - Math.sin(carRotY) * distance,
                carPos.y + height,
                carPos.z - Math.cos(carRotY) * distance
            );

            // Smooth spring damping
            this.camera.position.lerp(targetCamPos, 0.14);

            // Look slightly ahead of car
            const lookTarget = new THREE.Vector3(
                carPos.x + Math.sin(carRotY) * 12,
                carPos.y + 1.2,
                carPos.z + Math.cos(carRotY) * 12
            );
            this.camera.lookAt(lookTarget);

        } else if (this.cameraViewIndex === 1) {
            // 1: Hood / Cockpit Cam (Maximum speed sensation)
            const hoodOffset = new THREE.Vector3(
                carPos.x + Math.sin(carRotY) * 0.8,
                carPos.y + 1.1,
                carPos.z + Math.cos(carRotY) * 0.8
            );
            this.camera.position.copy(hoodOffset);
            const lookTarget = new THREE.Vector3(
                carPos.x + Math.sin(carRotY) * 25,
                carPos.y + 1.0,
                carPos.z + Math.cos(carRotY) * 25
            );
            this.camera.lookAt(lookTarget);

        } else if (this.cameraViewIndex === 2) {
            // 2: Bumper Cam (Tarmac scraper)
            const bumperOffset = new THREE.Vector3(
                carPos.x + Math.sin(carRotY) * 2.2,
                carPos.y + 0.45,
                carPos.z + Math.cos(carRotY) * 2.2
            );
            this.camera.position.copy(bumperOffset);
            const lookTarget = new THREE.Vector3(
                carPos.x + Math.sin(carRotY) * 35,
                carPos.y + 0.4,
                carPos.z + Math.cos(carRotY) * 35
            );
            this.camera.lookAt(lookTarget);

        } else if (this.cameraViewIndex === 3) {
            // 3: Drone / Helicopter Overhead Cam
            const dronePos = new THREE.Vector3(
                carPos.x,
                carPos.y + 18,
                carPos.z - 22
            );
            this.camera.position.lerp(dronePos, 0.1);
            this.camera.lookAt(new THREE.Vector3(carPos.x, carPos.y, carPos.z + 10));
        }

        // Camera micro-shake when pushing beyond 300 km/h or Nitro
        if (speed > 80 || this.playerCar.isNitroActive) {
            const shake = (speed / 100) * 0.04;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
        }
    }

    updateMinimap() {
        if (!this.minimapCtx || !this.playerCar) return;
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw track road boundaries
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 5, w - 20, h - 10);

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(w / 2, 5);
        ctx.lineTo(w / 2, h - 5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar view range: 250m ahead and 100m behind player
        const range = 350;
        const playerZ = this.playerCar.position.z;

        // Draw AI cars
        this.trackSystem.aiCars.forEach(ai => {
            const relZ = ai.position.z - (playerZ - 80);
            const normY = 1.0 - (relZ / range);
            if (normY >= 0 && normY <= 1) {
                const normX = (ai.position.x + 12) / 24; // road width is 24
                const px = 10 + normX * (w - 20);
                const py = 5 + normY * (h - 10);

                ctx.fillStyle = '#ff0055';
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Draw Player car (cyan glowing dot with triangle)
        const playerNormY = 1.0 - (80 / range);
        const playerNormX = (this.playerCar.position.x + 12) / 24;
        const pX = 10 + playerNormX * (w - 20);
        const pY = 5 + playerNormY * (h - 10);

        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pX, pY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    updateHUD() {
        if (!this.playerCar) return;

        const speedKmh = Math.round(Math.abs(this.playerCar.getSpeedKmh()));
        if (this.ui.speedValue) this.ui.speedValue.textContent = speedKmh;
        if (this.ui.gearValue) this.ui.gearValue.textContent = (this.playerCar.speed < -0.5) ? 'R' : this.playerCar.gear;

        const rpm = Math.round(this.playerCar.rpm);
        if (this.ui.rpmValue) this.ui.rpmValue.textContent = rpm;
        if (this.ui.rpmBar) {
            const rpmPercent = Math.min(100, Math.max(0, (rpm / 9000) * 100));
            this.ui.rpmBar.style.width = `${rpmPercent}%`;
            if (rpm > 8200) {
                this.ui.rpmBar.classList.add('redline');
            } else {
                this.ui.rpmBar.classList.remove('redline');
            }
        }

        if (this.ui.nitroBar) {
            this.ui.nitroBar.style.width = `${this.playerCar.nitroFuel}%`;
        }

        // Leaderboard position calculation
        const raceInfo = this.trackSystem.getRacePositions(this.playerCar);
        if (this.ui.racePos) {
            this.ui.racePos.textContent = `${raceInfo.rank} / ${raceInfo.total}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.isPlaying && !this.isPaused) {
            // In Typing mode, if player doesn't press keys, car cruises at idle speed (30 km/h)
            // Typing directly surges the car to 300+ km/h
            if (this.gameMode === 'typing') {
                this.inputState.forward = this.playerCar.speed < 12; // Base cruise
                // Gentle auto-centering on road
                if (Math.abs(this.playerCar.position.x) > 4) {
                    this.inputState.left = this.playerCar.position.x > 0;
                    this.inputState.right = this.playerCar.position.x < 0;
                } else {
                    this.inputState.left = false;
                    this.inputState.right = false;
                }
            }

            // Update Player SuperCar
            this.playerCar.update(delta, this.inputState, this.soundEngine);

            // Keep player on highway road width
            const halfRoad = this.trackSystem.roadWidth / 2 - 1.2;
            if (this.playerCar.position.x < -halfRoad) {
                this.playerCar.position.x = -halfRoad;
                this.playerCar.speed *= 0.95; // Wall friction
            } else if (this.playerCar.position.x > halfRoad) {
                this.playerCar.position.x = halfRoad;
                this.playerCar.speed *= 0.95;
            }

            // Update Track & AI Rivals
            const currentWpm = this.typingEngine.getStats().wpm;
            this.trackSystem.update(delta, this.playerCar, this.gameMode, currentWpm);

            // Update Camera dynamics
            this.updateCamera(delta);

            // Update HUD & Minimap
            this.updateHUD();
            this.updateMinimap();
            if (this.gameMode !== 'arcade') {
                this.updateTypingUI();
            }
        }

        // Render scene with bloom composer
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
}

// Global Game Instance
window.addEventListener('DOMContentLoaded', () => {
    window.game = new TurboTypeGame();
});
