// APEX VELOCITY 4K - Ultimate 3D Hypercar Racing Engine
// High-performance procedural 3D racing simulation (Pure Racing, 4K WebGL, Zero Typing)

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. PROCEDURAL WEB AUDIO SYNTHESIZER (Engine, Drift, Nitro & Music)
    // -------------------------------------------------------------
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.masterGain = null;
            this.sfxGain = null;
            this.musicGain = null;
            this.isMuted = false;
            this.sfxVolume = 0.85;
            this.musicVolume = 0.5;

            this.engineOsc1 = null;
            this.engineOsc2 = null;
            this.engineOsc3 = null;
            this.engineFilter = null;
            this.engineGain = null;
            this.engineRunning = false;

            this.driftGain = null;
            this.musicPlaying = false;
            this.musicInterval = null;
            this.musicStep = 0;
            this.musicBpm = 132;
        }

        init() {
            if (this.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.initEngineSound();
            this.initDriftSound();
        }

        resume() {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        initEngineSound() {
            if (!this.ctx) return;
            try {
                this.engineOsc1 = this.ctx.createOscillator();
                this.engineOsc2 = this.ctx.createOscillator();
                this.engineOsc3 = this.ctx.createOscillator();

                this.engineOsc1.type = 'sawtooth';
                this.engineOsc2.type = 'triangle';
                this.engineOsc3.type = 'square';

                this.engineFilter = this.ctx.createBiquadFilter();
                this.engineFilter.type = 'lowpass';
                this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
                this.engineFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

                this.engineGain = this.ctx.createGain();
                this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

                const sub1 = this.ctx.createGain();
                const sub2 = this.ctx.createGain();
                const sub3 = this.ctx.createGain();
                sub1.gain.value = 0.55;
                sub2.gain.value = 0.35;
                sub3.gain.value = 0.12;

                this.engineOsc1.connect(sub1);
                this.engineOsc2.connect(sub2);
                this.engineOsc3.connect(sub3);

                sub1.connect(this.engineFilter);
                sub2.connect(this.engineFilter);
                sub3.connect(this.engineFilter);

                this.engineFilter.connect(this.engineGain);
                this.engineGain.connect(this.sfxGain);

                this.engineOsc1.start();
                this.engineOsc2.start();
                this.engineOsc3.start();
                this.engineRunning = true;
            } catch (e) {
                console.warn('Engine audio error:', e);
            }
        }

        updateEngineSound(rpm, speedRatio, isAccelerating) {
            if (!this.ctx || !this.engineRunning) return;
            const time = this.ctx.currentTime;
            // Idle ~42Hz, Redline ~360Hz
            const baseFreq = 40 + (rpm / 9000) * 280;

            this.engineOsc1.frequency.setTargetAtTime(baseFreq, time, 0.05);
            this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, time, 0.05);
            this.engineOsc3.frequency.setTargetAtTime(baseFreq * 1.5, time, 0.05);

            const filterCutoff = 220 + Math.pow(rpm / 9000, 1.4) * 2600 + (isAccelerating ? 450 : 0);
            this.engineFilter.frequency.setTargetAtTime(filterCutoff, time, 0.05);

            const targetVol = isAccelerating ? (0.28 + speedRatio * 0.26) : 0.12;
            this.engineGain.gain.setTargetAtTime(targetVol, time, 0.08);
        }

        initDriftSound() {
            if (!this.ctx) return;
            try {
                const bufferSize = this.ctx.sampleRate * 2;
                const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }

                const whiteNoise = this.ctx.createBufferSource();
                whiteNoise.buffer = noiseBuffer;
                whiteNoise.loop = true;

                const bandpass = this.ctx.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.value = 1150;
                bandpass.Q.value = 3.5;

                this.driftGain = this.ctx.createGain();
                this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

                whiteNoise.connect(bandpass);
                bandpass.connect(this.driftGain);
                this.driftGain.connect(this.sfxGain);
                whiteNoise.start();
            } catch (e) {
                console.warn('Drift sound error:', e);
            }
        }

        updateDriftSound(driftIntensity) {
            if (!this.driftGain || !this.ctx) return;
            const targetGain = Math.min(Math.max(driftIntensity, 0), 1) * 0.45;
            this.driftGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
        }

        playGearShift() {
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(25, now + 0.14);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.15);
            } catch (e) {}
        }

        playNitro() {
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime;
                // Sub bass punch
                const bass = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bass.type = 'sine';
                bass.frequency.setValueAtTime(200, now);
                bass.frequency.exponentialRampToValueAtTime(35, now + 0.4);

                bassGain.gain.setValueAtTime(0.65, now);
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

                bass.connect(bassGain);
                bassGain.connect(this.sfxGain);
                bass.start(now);
                bass.stop(now + 0.42);
            } catch (e) {}
        }

        startMusic() {
            if (!this.ctx || this.musicPlaying) return;
            this.musicPlaying = true;
            this.musicStep = 0;
            const bassNotes = [110, 110, 130.81, 146.83, 98, 98, 123.47, 130.81];
            const stepTime = (60 / this.musicBpm) / 4;

            this.musicInterval = setInterval(() => {
                if (!this.musicPlaying || !this.ctx) return;
                const now = this.ctx.currentTime;
                const step = this.musicStep % 16;

                // Kick
                if (step % 4 === 0) {
                    const kick = this.ctx.createOscillator();
                    const kickGain = this.ctx.createGain();
                    kick.frequency.setValueAtTime(150, now);
                    kick.frequency.exponentialRampToValueAtTime(35, now + 0.13);
                    kickGain.gain.setValueAtTime(0.42, now);
                    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                    kick.connect(kickGain);
                    kickGain.connect(this.musicGain);
                    kick.start(now);
                    kick.stop(now + 0.15);
                }

                // Synth Bassline
                if (step % 2 === 0) {
                    const bass = this.ctx.createOscillator();
                    const filter = this.ctx.createBiquadFilter();
                    const gain = this.ctx.createGain();

                    const note = bassNotes[Math.floor(this.musicStep / 4) % bassNotes.length];
                    bass.type = 'sawtooth';
                    bass.frequency.setValueAtTime(note, now);

                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(450 + (step % 4) * 140, now);

                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 1.6);

                    bass.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.musicGain);
                    bass.start(now);
                    bass.stop(now + stepTime * 1.8);
                }

                this.musicStep++;
            }, stepTime * 1000);
        }

        stopMusic() {
            this.musicPlaying = false;
            if (this.musicInterval) {
                clearInterval(this.musicInterval);
                this.musicInterval = null;
            }
        }

        toggleMute() {
            this.isMuted = !this.isMuted;
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
            }
            return this.isMuted;
        }
    }

    // -------------------------------------------------------------
    // 2. HIGH-DETAIL 3D SUPERCAR MODEL & RACING PHYSICS
    // -------------------------------------------------------------
    class SuperCar {
        constructor(scene, options = {}) {
            this.scene = scene;
            this.isAI = options.isAI || false;
            this.color = options.color || 0x00f0ff;
            this.underglowColor = options.underglowColor || 0x00f0ff;
            this.name = options.name || 'APEX-ONE';

            // Physics state
            this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
            this.rotation = new THREE.Euler(0, options.rotationY || 0, 0, 'YXZ');
            this.speed = 0; // m/s
            this.maxSpeed = this.isAI ? 72 : 92; // ~330 km/h
            this.nitroMaxSpeed = 120; // ~432 km/h
            this.acceleration = 28.0;
            this.braking = 46.0;
            this.friction = 3.8;
            this.steeringAngle = 0;
            this.maxSteeringAngle = 0.58;
            this.steeringSpeed = 3.6;
            this.targetLaneX = this.position.x;

            // Telemetry & Nitro
            this.gear = 1;
            this.rpm = 900;
            this.isNitroActive = false;
            this.nitroFuel = 100;
            this.isDrifting = false;

            this.mesh = new THREE.Group();
            this.wheels = [];
            this.frontWheels = [];
            this.exhaustFlames = [];

            this.buildModel();
            this.scene.add(this.mesh);
        }

        buildModel() {
            // Metallic PBR paint material
            this.paintMat = new THREE.MeshStandardMaterial({
                color: this.color,
                metalness: 0.9,
                roughness: 0.15,
            });

            const carbonMat = new THREE.MeshStandardMaterial({
                color: 0x111116,
                metalness: 0.35,
                roughness: 0.5,
            });

            const glassMat = new THREE.MeshStandardMaterial({
                color: 0x091422,
                metalness: 0.95,
                roughness: 0.08,
            });

            const chromeMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.98,
                roughness: 0.08,
            });

            const tireMat = new THREE.MeshStandardMaterial({
                color: 0x161616,
                roughness: 0.9,
            });

            // 1. Lower Aerodynamic Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.42, 4.3), this.paintMat);
            body.position.y = 0.35;
            body.castShadow = true;
            this.mesh.add(body);

            // 2. Cockpit Canopy
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.48, 2.05), glassMat);
            cabin.position.set(0, 0.72, -0.2);
            this.mesh.add(cabin);

            // Roof Cover
            const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.8), this.paintMat);
            roof.position.set(0, 0.98, -0.2);
            this.mesh.add(roof);

            // 3. Hood & Carbon Splitter
            const hood = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.22, 1.45), this.paintMat);
            hood.position.set(0, 0.45, 1.35);
            hood.rotation.x = -0.06;
            this.mesh.add(hood);

            const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.06, 0.42), carbonMat);
            splitter.position.set(0, 0.15, 2.2);
            this.mesh.add(splitter);

            // 4. GT Racing Wing & Carbon Diffuser
            const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.2, 0.5), carbonMat);
            diffuser.position.set(0, 0.25, -2.15);
            this.mesh.add(diffuser);

            const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.05, 0.48), carbonMat);
            wing.position.set(0, 1.18, -1.95);
            const pL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.16), carbonMat);
            pL.position.set(-0.62, 0.92, -1.95);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.16), carbonMat);
            pR.position.set(0.62, 0.92, -1.95);
            this.mesh.add(wing);
            this.mesh.add(pL);
            this.mesh.add(pR);

            // 5. LED Projector Headlights
            const headLampGeo = new THREE.BoxGeometry(0.42, 0.08, 0.1);
            const headLampMat = new THREE.MeshBasicMaterial({ color: 0xe5f8ff });
            const hL = new THREE.Mesh(headLampGeo, headLampMat);
            hL.position.set(-0.72, 0.42, 2.12);
            const hR = new THREE.Mesh(headLampGeo, headLampMat);
            hR.position.set(0.72, 0.42, 2.12);
            this.mesh.add(hL);
            this.mesh.add(hR);

            // Real Spotlight beams casting forward
            if (!this.isAI) {
                const spotL = new THREE.SpotLight(0xcdefff, 3.5, 75, Math.PI / 5.5, 0.35, 1.2);
                spotL.position.set(-0.72, 0.45, 2.1);
                spotL.target.position.set(-0.72, 0, 40);
                this.mesh.add(spotL);
                this.mesh.add(spotL.target);

                const spotR = new THREE.SpotLight(0xcdefff, 3.5, 75, Math.PI / 5.5, 0.35, 1.2);
                spotR.position.set(0.72, 0.45, 2.1);
                spotR.target.position.set(0.72, 0, 40);
                this.mesh.add(spotR);
                this.mesh.add(spotR.target);
            }

            // 6. LED Taillight Bar
            this.tailLampMat = new THREE.MeshBasicMaterial({ color: 0xff1030 });
            const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.08), this.tailLampMat);
            tailLamp.position.set(0, 0.52, -2.16);
            this.mesh.add(tailLamp);

            // 7. Alloy Rim Wheels & Brake Discs
            const wheelRadius = 0.38;
            const wheelWidth = 0.32;
            const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 22);
            wheelGeo.rotateZ(Math.PI / 2);

            const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.72, wheelRadius * 0.72, wheelWidth + 0.02, 16);
            rimGeo.rotateZ(Math.PI / 2);

            const wheelPositions = [
                { x: -0.98, y: 0.38, z: 1.4, isFront: true },
                { x: 0.98, y: 0.38, z: 1.4, isFront: true },
                { x: -1.0, y: 0.40, z: -1.4, isFront: false },
                { x: 1.0, y: 0.40, z: -1.4, isFront: false }
            ];

            wheelPositions.forEach((pos) => {
                const anchor = new THREE.Group();
                anchor.position.set(pos.x, pos.y, pos.z);

                const tire = new THREE.Mesh(wheelGeo, tireMat);
                tire.castShadow = true;
                const rim = new THREE.Mesh(rimGeo, chromeMat);

                anchor.add(tire);
                anchor.add(rim);

                this.mesh.add(anchor);
                this.wheels.push({ anchor: anchor, mesh: tire });
                if (pos.isFront) {
                    this.frontWheels.push(anchor);
                }
            });

            // 8. Dual Exhaust Pipes & Nitro Fire Jets
            const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 14);
            exhaustGeo.rotateX(Math.PI / 2);
            const exL = new THREE.Mesh(exhaustGeo, chromeMat);
            exL.position.set(-0.4, 0.24, -2.18);
            const exR = new THREE.Mesh(exhaustGeo, chromeMat);
            exR.position.set(0.4, 0.24, -2.18);
            this.mesh.add(exL);
            this.mesh.add(exR);

            const flameGeo = new THREE.ConeGeometry(0.14, 0.85, 8);
            flameGeo.rotateX(-Math.PI / 2);
            this.flameMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.0
            });

            const flameL = new THREE.Mesh(flameGeo, this.flameMat);
            flameL.position.set(-0.4, 0.24, -2.55);
            const flameR = new THREE.Mesh(flameGeo, this.flameMat);
            flameR.position.set(0.4, 0.24, -2.55);
            this.mesh.add(flameL);
            this.mesh.add(flameR);
            this.exhaustFlames.push(flameL, flameR);

            // 9. Neon Underglow Light
            this.underglowLight = new THREE.PointLight(this.underglowColor, 2.5, 7, 2.0);
            this.underglowLight.position.set(0, 0.12, 0);
            this.mesh.add(this.underglowLight);
        }

        setPaintColor(hex) {
            this.color = hex;
            if (this.paintMat) this.paintMat.color.setHex(hex);
        }

        setUnderglowColor(hex) {
            this.underglowColor = hex;
            if (this.underglowLight) this.underglowLight.color.setHex(hex);
        }

        update(delta, input = {}, soundEngine = null) {
            const isForward = input.forward || false;
            const isBraking = input.backward || false;
            const isSteerLeft = input.left || false;
            const isSteerRight = input.right || false;
            const isHandbrake = input.handbrake || false;
            const isNitroRequested = input.nitro && this.nitroFuel > 4;

            // Nitro Boost Logic
            if (isNitroRequested && (isForward || this.speed > 10)) {
                this.isNitroActive = true;
                this.nitroFuel = Math.max(0, this.nitroFuel - delta * 28);
                if (this.flameMat) this.flameMat.opacity = 0.98;
                if (soundEngine && Math.random() < 0.12) soundEngine.playNitro();
            } else {
                this.isNitroActive = false;
                // Regenerate nitro while driving
                if (!this.isAI && this.speed > 15) {
                    this.nitroFuel = Math.min(100, this.nitroFuel + delta * 7.5);
                }
                if (this.flameMat) this.flameMat.opacity = 0.0;
            }

            const currentMax = this.isNitroActive ? this.nitroMaxSpeed : this.maxSpeed;
            const accelMult = this.isNitroActive ? 2.3 : 1.0;

            // Acceleration & Braking
            if (isForward) {
                this.speed += this.acceleration * accelMult * delta;
                if (this.speed > currentMax) {
                    this.speed = Math.max(this.speed - this.friction * 2 * delta, currentMax);
                }
            } else if (isBraking) {
                if (this.speed > 0.5) {
                    this.speed -= this.braking * delta;
                    if (this.speed < 0) this.speed = 0;
                } else {
                    // Reverse
                    this.speed -= this.acceleration * 0.45 * delta;
                    if (this.speed < -15) this.speed = -15;
                }
            } else {
                if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * delta);
                else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * delta);
            }

            // Taillight glow on brake
            if (this.tailLampMat) {
                this.tailLampMat.color.setHex(isBraking ? 0xff0020 : 0xaa0515);
            }

            // Steering dynamics
            const targetSteer = (isSteerLeft ? 1 : 0) - (isSteerRight ? 1 : 0);
            this.steeringAngle = THREE.MathUtils.lerp(
                this.steeringAngle,
                targetSteer * this.maxSteeringAngle,
                this.steeringSpeed * delta * 2.8
            );

            this.frontWheels.forEach(w => {
                w.rotation.y = this.steeringAngle;
            });

            this.isDrifting = (isHandbrake || (Math.abs(this.steeringAngle) > 0.34 && this.speed > 38));

            // Car yaw rotation
            if (Math.abs(this.speed) > 0.5) {
                const turnRate = (this.speed / currentMax) * this.steeringAngle * 1.85;
                this.rotation.y += turnRate * delta * (this.isDrifting ? 1.45 : 1.0);
            }

            // Apply forward velocity
            const forward = new THREE.Vector3(Math.sin(this.rotation.y), 0, Math.cos(this.rotation.y));
            this.position.addScaledVector(forward, this.speed * delta);
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation.y;

            // Suspension dynamic pitch and roll
            this.mesh.rotation.z = -this.steeringAngle * (this.speed / currentMax) * 0.13;
            this.mesh.rotation.x = (isBraking ? -0.05 : (isForward ? 0.025 : 0)) * (this.speed / currentMax);

            // Wheel rotation spin
            const spin = (this.speed * delta) / 0.38;
            this.wheels.forEach(w => {
                w.mesh.rotation.x += spin;
            });

            // Gear & RPM
            const speedKmh = Math.abs(this.getSpeedKmh());
            this.calculateGearAndRPM(speedKmh, isForward, soundEngine);

            // Sound
            if (soundEngine && !this.isAI) {
                soundEngine.updateEngineSound(this.rpm, this.speed / currentMax, isForward);
                soundEngine.updateDriftSound(this.isDrifting ? Math.abs(this.steeringAngle) : 0);
            }

            // Exhaust fire flicker
            if (this.isNitroActive) {
                this.exhaustFlames.forEach(f => {
                    f.scale.set(1.0, 1.0, 1.0 + Math.random() * 0.7);
                });
            }
        }

        calculateGearAndRPM(speedKmh, isAccelerating, soundEngine) {
            const thresholds = [0, 48, 96, 150, 220, 290, 380];
            let newGear = 1;
            for (let i = 1; i < thresholds.length; i++) {
                if (speedKmh > thresholds[i]) newGear = i + 1;
            }

            if (newGear !== this.gear && !this.isAI) {
                if (soundEngine && newGear > this.gear) soundEngine.playGearShift();
                this.gear = newGear;
            }

            const low = thresholds[this.gear - 1] || 0;
            const high = thresholds[this.gear] || 420;
            const ratio = (speedKmh - low) / Math.max(1, (high - low));
            this.rpm = THREE.MathUtils.lerp(this.rpm, 1000 + ratio * 7600, 0.12);
        }

        getSpeedKmh() {
            return this.speed * 3.6;
        }
    }

    // -------------------------------------------------------------
    // 3. INFINITE 4K HIGHWAY & COMPETITOR AI RACERS
    // -------------------------------------------------------------
    class TrackSystem {
        constructor(scene) {
            this.scene = scene;
            this.segmentLength = 120;
            this.numSegments = 16;
            this.roadWidth = 24; // 4 wide lanes
            this.segments = [];
            this.aiCars = [];
            this.sceneryGroup = new THREE.Group();
            this.scene.add(this.sceneryGroup);

            this.initMaterials();
            this.buildInitialTrack();
            this.spawnCitySkyline();
        }

        initMaterials() {
            // Reflective tarmac
            this.roadMat = new THREE.MeshStandardMaterial({
                color: 0x12151c,
                roughness: 0.3,
                metalness: 0.7,
            });

            this.laneMarkMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            this.barrierMat = new THREE.MeshStandardMaterial({ color: 0x1e222c, metalness: 0.9, roughness: 0.2 });
            this.barrierLightMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

            const neonColors = [0x00ffff, 0xff007f, 0x00ff66, 0xffaa00, 0x9900ff];
            this.neonMats = neonColors.map(c => new THREE.MeshBasicMaterial({ color: c }));
        }

        createSegment(zOffset) {
            const seg = new THREE.Group();
            seg.position.z = zOffset;

            // Road surface
            const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
            roadGeo.rotateX(-Math.PI / 2);
            const road = new THREE.Mesh(roadGeo, this.roadMat);
            road.receiveShadow = true;
            seg.add(road);

            // Dashed dividing lane markers
            const lanes = [-this.roadWidth * 0.25, 0, this.roadWidth * 0.25];
            const dashCount = 8;
            const dashLen = 6;
            const spacing = this.segmentLength / dashCount;

            lanes.forEach(x => {
                for (let d = 0; d < dashCount; d++) {
                    const dashGeo = new THREE.PlaneGeometry(0.32, dashLen);
                    dashGeo.rotateX(-Math.PI / 2);
                    const dash = new THREE.Mesh(dashGeo, this.laneMarkMat);
                    dash.position.set(x, 0.02, -this.segmentLength / 2 + d * spacing + dashLen / 2);
                    seg.add(dash);
                }
            });

            // Barriers with glowing LED edges
            const barGeo = new THREE.BoxGeometry(0.8, 1.2, this.segmentLength);
            const neonGeo = new THREE.BoxGeometry(0.12, 0.16, this.segmentLength);

            const bL = new THREE.Mesh(barGeo, this.barrierMat);
            bL.position.set(-this.roadWidth / 2 - 0.4, 0.6, 0);
            const nL = new THREE.Mesh(neonGeo, this.barrierLightMat);
            nL.position.set(-this.roadWidth / 2 + 0.05, 1.1, 0);
            seg.add(bL);
            seg.add(nL);

            const bR = new THREE.Mesh(barGeo, this.barrierMat);
            bR.position.set(this.roadWidth / 2 + 0.4, 0.6, 0);
            const nR = new THREE.Mesh(neonGeo, this.barrierLightMat);
            nR.position.set(this.roadWidth / 2 - 0.05, 1.1, 0);
            seg.add(bR);
            seg.add(nR);

            // Overhead Electronic Gantry
            if (Math.abs(zOffset) % (this.segmentLength * 2) === 0) {
                const arch = this.createArch();
                seg.add(arch);
            }

            // Roadside Neon Billboards
            if (Math.random() > 0.4) {
                const side = Math.random() > 0.5 ? 1 : -1;
                const billboard = this.createBillboard();
                billboard.position.set(side * (this.roadWidth / 2 + 8), 6, (Math.random() - 0.5) * 40);
                billboard.rotation.y = side > 0 ? -Math.PI / 6 : Math.PI / 6;
                seg.add(billboard);
            }

            this.sceneryGroup.add(seg);
            return seg;
        }

        createArch() {
            const arch = new THREE.Group();
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2029, metalness: 0.9 });
            const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

            const pL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 1.2), frameMat);
            pL.position.set(-this.roadWidth / 2 - 1, 4, 0);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8, 1.2), frameMat);
            pR.position.set(this.roadWidth / 2 + 1, 4, 0);

            const beam = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 4, 1.0, 1.2), frameMat);
            beam.position.set(0, 7.8, 0);

            const neon = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 2, 0.16, 0.4), neonMat);
            neon.position.set(0, 7.3, 0);

            arch.add(pL);
            arch.add(pR);
            arch.add(beam);
            arch.add(neon);
            return arch;
        }

        createBillboard() {
            const group = new THREE.Group();
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x111116, metalness: 0.8 });
            const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.4), frameMat);

            const mat = this.neonMats[Math.floor(Math.random() * this.neonMats.length)];
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.6), mat);
            screen.position.z = 0.22;

            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 8), frameMat);
            pole.position.y = -4;

            group.add(frame);
            group.add(screen);
            group.add(pole);
            return group;
        }

        buildInitialTrack() {
            for (let i = 0; i < this.numSegments; i++) {
                const z = i * this.segmentLength - (this.segmentLength * 2);
                this.segments.push(this.createSegment(z));
            }
        }

        spawnCitySkyline() {
            this.cityGroup = new THREE.Group();
            const bldgMat = new THREE.MeshStandardMaterial({ color: 0x080a12, metalness: 0.85, roughness: 0.2 });

            for (let i = 0; i < 85; i++) {
                const height = 35 + Math.random() * 100;
                const width = 16 + Math.random() * 28;
                const depth = 16 + Math.random() * 28;
                const bldg = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bldgMat);

                const side = Math.random() > 0.5 ? 1 : -1;
                const x = side * (this.roadWidth / 2 + 35 + Math.random() * 120);
                const z = (Math.random() - 0.2) * (this.numSegments * this.segmentLength);
                bldg.position.set(x, height / 2, z);

                if (Math.random() > 0.3) {
                    const winMat = this.neonMats[Math.floor(Math.random() * this.neonMats.length)];
                    const win = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.05, depth * 0.9), winMat);
                    win.position.set(x, height * (0.4 + Math.random() * 0.5), z);
                    this.cityGroup.add(win);
                }

                this.cityGroup.add(bldg);
            }
            this.sceneryGroup.add(this.cityGroup);
        }

        spawnAIRivals(playerZ) {
            const configs = [
                { name: 'PHANTOM-V8', color: 0xff0044, underglow: 0xff0044, speed: 68, offsetZ: 70, lane: -6 },
                { name: 'VIPER-GT', color: 0xffbb00, underglow: 0xffbb00, speed: 74, offsetZ: 150, lane: 2 },
                { name: 'NEXUS-TURBO', color: 0x00ff88, underglow: 0x00ff88, speed: 80, offsetZ: 250, lane: -2 },
                { name: 'KRONOS-9', color: 0x9900ff, underglow: 0x9900ff, speed: 85, offsetZ: 360, lane: 6 },
                { name: 'TITAN-HYPER', color: 0xffffff, underglow: 0x00e5ff, speed: 90, offsetZ: 490, lane: 0 }
            ];

            configs.forEach(cfg => {
                const ai = new SuperCar(this.scene, {
                    isAI: true,
                    color: cfg.color,
                    underglowColor: cfg.underglow,
                    name: cfg.name,
                    x: cfg.lane,
                    z: playerZ + cfg.offsetZ
                });
                ai.baseSpeed = cfg.speed;
                ai.targetLaneX = cfg.lane;
                this.aiCars.push(ai);
            });
        }

        update(delta, playerCar) {
            const playerZ = playerCar.position.z;

            // Endless track recycling
            this.segments.forEach(seg => {
                if (seg.position.z < playerZ - this.segmentLength * 2.5) {
                    let maxZ = -Infinity;
                    this.segments.forEach(s => {
                        if (s.position.z > maxZ) maxZ = s.position.z;
                    });
                    seg.position.z = maxZ + this.segmentLength;
                }
            });

            if (this.cityGroup) {
                this.cityGroup.position.z = playerZ * 0.7; // Parallax
            }

            // AI rival behaviors
            this.aiCars.forEach(ai => {
                // Occasional lane changes
                if (Math.random() < 0.012) {
                    const lanes = [-6, -2, 2, 6];
                    ai.targetLaneX = lanes[Math.floor(Math.random() * lanes.length)];
                }

                const steerDiff = ai.targetLaneX - ai.position.x;
                const aiInput = {
                    forward: ai.speed < ai.baseSpeed,
                    backward: ai.speed > ai.baseSpeed + 6,
                    left: steerDiff < -0.3,
                    right: steerDiff > 0.3,
                    nitro: Math.random() < 0.025
                };

                ai.update(delta, aiInput);
                ai.position.x = Math.max(-this.roadWidth / 2 + 1.5, Math.min(this.roadWidth / 2 - 1.5, ai.position.x));

                // Respawn AI ahead if fallen far behind
                if (ai.position.z < playerZ - 130) {
                    ai.position.z = playerZ + 260 + Math.random() * 220;
                    ai.speed = ai.baseSpeed * 0.8;
                }
            });
        }

        getRacePositions(playerCar) {
            const all = [
                { isPlayer: true, name: 'PLAYER (YOU)', z: playerCar.position.z, speed: playerCar.getSpeedKmh() }
            ];
            this.aiCars.forEach(ai => {
                all.push({ isPlayer: false, name: ai.name, z: ai.position.z, speed: ai.getSpeedKmh() });
            });
            all.sort((a, b) => b.z - a.z);
            const rank = all.findIndex(c => c.isPlayer) + 1;
            return { rank: rank, total: all.length, leader: all[0] };
        }
    }

    // -------------------------------------------------------------
    // 4. MAIN GAME ORCHESTRATOR & 4K RENDER LOOP
    // -------------------------------------------------------------
    class ApexVelocityGame {
        constructor() {
            this.container = document.getElementById('canvas-container');
            this.clock = new THREE.Clock();

            this.isPlaying = false;
            this.isPaused = false;
            this.cameraViewIndex = 0;
            this.cameraViews = ['CHASE', 'HOOD', 'BUMPER', 'DRONE'];
            this.graphicsQuality = 'ultra';

            this.inputState = {
                forward: false,
                backward: false,
                left: false,
                right: false,
                handbrake: false,
                nitro: false
            };

            this.soundEngine = new SoundEngine();

            this.scene = null;
            this.camera = null;
            this.renderer = null;

            this.playerCar = null;
            this.trackSystem = null;

            // Minimap canvas
            this.minimapCanvas = document.getElementById('minimap-canvas');
            this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

            // UI Elements
            this.ui = {
                speedValue: document.getElementById('speed-value'),
                gearValue: document.getElementById('gear-value'),
                rpmValue: document.getElementById('rpm-value'),
                rpmBar: document.getElementById('rpm-bar-fill'),
                nitroBar: document.getElementById('nitro-bar-fill'),
                racePos: document.getElementById('race-position'),
                topSpeedVal: document.getElementById('top-speed-record'),
                cameraLabel: document.getElementById('camera-mode-label'),
                overtakeBanner: document.getElementById('overtake-banner')
            };

            this.topSpeedRecord = 0;
            this.lastOvertakenRank = 6;

            this.initThree();
            this.initWorld();
            this.bindEvents();
            this.animate();
        }

        initThree() {
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x060810);
            this.scene.fog = new THREE.FogExp2(0x060810, 0.005);

            this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1300);

            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // 4K Crisp Rendering
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            this.container.appendChild(this.renderer.domElement);

            const ambient = new THREE.AmbientLight(0x2a354d, 1.25);
            this.scene.add(ambient);

            const dirLight = new THREE.DirectionalLight(0x7faaff, 1.85);
            dirLight.position.set(40, 100, 50);
            dirLight.castShadow = true;
            this.scene.add(dirLight);
        }

        initWorld() {
            this.trackSystem = new TrackSystem(this.scene);
            this.playerCar = new SuperCar(this.scene, {
                isAI: false,
                color: 0x00f0ff,
                underglowColor: 0x00f0ff,
                name: 'APEX-ONE',
                x: 0,
                z: 0
            });
            this.trackSystem.spawnAIRivals(this.playerCar.position.z);
        }

        startGame() {
            this.isPlaying = true;
            this.isPaused = false;

            this.soundEngine.init();
            this.soundEngine.resume();
            this.soundEngine.startMusic();

            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('hud-overlay').classList.remove('hidden');
        }

        togglePause() {
            if (!this.isPlaying) return;
            this.isPaused = !this.isPaused;
            const pauseMenu = document.getElementById('pause-modal');
            if (pauseMenu) pauseMenu.classList.toggle('hidden', !this.isPaused);
        }

        cycleCamera() {
            this.cameraViewIndex = (this.cameraViewIndex + 1) % this.cameraViews.length;
            const label = this.cameraViews[this.cameraViewIndex];
            if (this.ui.cameraLabel) this.ui.cameraLabel.textContent = `CAM: ${label}`;
        }

        setGraphicsQuality(quality) {
            this.graphicsQuality = quality;
            if (quality === 'ultra') {
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            } else {
                this.renderer.setPixelRatio(1);
            }
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Driving key controls
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.togglePause();
                    return;
                }
                if (e.key === 'c' || e.key === 'C') {
                    this.cycleCamera();
                    return;
                }
                if (e.key === 'r' || e.key === 'R') {
                    // Quick track reset
                    if (this.playerCar) {
                        this.playerCar.position.x = 0;
                        this.playerCar.rotation.y = 0;
                        this.playerCar.speed = Math.max(20, this.playerCar.speed * 0.8);
                    }
                    return;
                }

                if (!this.isPlaying || this.isPaused) return;

                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.inputState.forward = true;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.inputState.backward = true;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputState.left = true;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputState.right = true;
                if (e.key === ' ') this.inputState.handbrake = true;
                if (e.key === 'Shift' || e.key === 'n' || e.key === 'N') this.inputState.nitro = true;
            });

            window.addEventListener('keyup', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.inputState.forward = false;
                if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.inputState.backward = false;
                if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.inputState.left = false;
                if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.inputState.right = false;
                if (e.key === ' ') this.inputState.handbrake = false;
                if (e.key === 'Shift' || e.key === 'n' || e.key === 'N') this.inputState.nitro = false;
            });
        }

        triggerOvertake(rank) {
            if (!this.ui.overtakeBanner) return;
            this.ui.overtakeBanner.textContent = `⚡ OVERTAKEN! POSITION: P${rank}`;
            this.ui.overtakeBanner.classList.add('visible');
            setTimeout(() => {
                if (this.ui.overtakeBanner) this.ui.overtakeBanner.classList.remove('visible');
            }, 1800);
        }

        updateCamera() {
            if (!this.playerCar) return;
            const carPos = this.playerCar.position;
            const rotY = this.playerCar.rotation.y;
            const speed = this.playerCar.speed;

            // Dynamic FOV speed warp effect (widens as speed climbs to 350+ km/h)
            const targetFOV = 68 + Math.min(speed / 90, 1.0) * 22;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.1);
            this.camera.updateProjectionMatrix();

            if (this.cameraViewIndex === 0) {
                // 1. Dynamic 3rd-Person Chase Cam
                const dist = 8.2 + Math.min(speed / 80, 1.0) * 2.5;
                const targetPos = new THREE.Vector3(
                    carPos.x - Math.sin(rotY) * dist,
                    carPos.y + 3.4,
                    carPos.z - Math.cos(rotY) * dist
                );
                this.camera.position.lerp(targetPos, 0.15);
                this.camera.lookAt(new THREE.Vector3(carPos.x + Math.sin(rotY) * 12, carPos.y + 1.2, carPos.z + Math.cos(rotY) * 12));
            } else if (this.cameraViewIndex === 1) {
                // 2. Cockpit / Hood Cam (Extreme velocity sensation)
                this.camera.position.set(carPos.x + Math.sin(rotY) * 0.8, carPos.y + 1.1, carPos.z + Math.cos(rotY) * 0.8);
                this.camera.lookAt(new THREE.Vector3(carPos.x + Math.sin(rotY) * 25, carPos.y + 1.0, carPos.z + Math.cos(rotY) * 25));
            } else if (this.cameraViewIndex === 2) {
                // 3. Low Bumper Cam (Tarmac scraper)
                this.camera.position.set(carPos.x + Math.sin(rotY) * 2.2, carPos.y + 0.45, carPos.z + Math.cos(rotY) * 2.2);
                this.camera.lookAt(new THREE.Vector3(carPos.x + Math.sin(rotY) * 35, carPos.y + 0.4, carPos.z + Math.cos(rotY) * 35));
            } else if (this.cameraViewIndex === 3) {
                // 4. Helicopter Drone Cam
                const dronePos = new THREE.Vector3(carPos.x, carPos.y + 18, carPos.z - 22);
                this.camera.position.lerp(dronePos, 0.1);
                this.camera.lookAt(new THREE.Vector3(carPos.x, carPos.y, carPos.z + 10));
            }

            // High speed vibration shake
            if (speed > 80 || this.playerCar.isNitroActive) {
                const shake = (speed / 100) * 0.045;
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
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 5, w - 20, h - 10);

            // Center lane
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(w / 2, 5);
            ctx.lineTo(w / 2, h - 5);
            ctx.stroke();
            ctx.setLineDash([]);

            const range = 360;
            const playerZ = this.playerCar.position.z;

            // AI Rivals
            this.trackSystem.aiCars.forEach(ai => {
                const relZ = ai.position.z - (playerZ - 80);
                const normY = 1.0 - (relZ / range);
                if (normY >= 0 && normY <= 1) {
                    const normX = (ai.position.x + 12) / 24;
                    ctx.fillStyle = '#ff0055';
                    ctx.beginPath();
                    ctx.arc(10 + normX * (w - 20), 5 + normY * (h - 10), 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Player car
            const pNormY = 1.0 - (80 / range);
            const pNormX = (this.playerCar.position.x + 12) / 24;
            ctx.fillStyle = '#00f0ff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(10 + pNormX * (w - 20), 5 + pNormY * (h - 10), 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        updateHUD() {
            if (!this.playerCar) return;
            const kmh = Math.round(Math.abs(this.playerCar.getSpeedKmh()));
            if (this.ui.speedValue) this.ui.speedValue.textContent = kmh;
            if (this.ui.gearValue) this.ui.gearValue.textContent = (this.playerCar.speed < -0.5) ? 'R' : this.playerCar.gear;

            // Top speed tracker
            if (kmh > this.topSpeedRecord) {
                this.topSpeedRecord = kmh;
                if (this.ui.topSpeedVal) this.ui.topSpeedVal.textContent = `${this.topSpeedRecord} KM/H`;
            }

            const rpm = Math.round(this.playerCar.rpm);
            if (this.ui.rpmValue) this.ui.rpmValue.textContent = rpm;
            if (this.ui.rpmBar) {
                this.ui.rpmBar.style.width = `${Math.min(100, Math.max(0, (rpm / 9000) * 100))}%`;
                if (rpm > 8200) this.ui.rpmBar.classList.add('redline');
                else this.ui.rpmBar.classList.remove('redline');
            }

            if (this.ui.nitroBar) {
                this.ui.nitroBar.style.width = `${this.playerCar.nitroFuel}%`;
            }

            const raceInfo = this.trackSystem.getRacePositions(this.playerCar);
            if (this.ui.racePos) {
                this.ui.racePos.textContent = `${raceInfo.rank} / ${raceInfo.total}`;
            }

            if (raceInfo.rank < this.lastOvertakenRank) {
                this.triggerOvertake(raceInfo.rank);
                this.lastOvertakenRank = raceInfo.rank;
            } else if (raceInfo.rank > this.lastOvertakenRank) {
                this.lastOvertakenRank = raceInfo.rank;
            }
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            const delta = Math.min(this.clock.getDelta(), 0.1);

            if (this.isPlaying && !this.isPaused) {
                this.playerCar.update(delta, this.inputState, this.soundEngine);

                // Road bounds collision
                const halfRoad = this.trackSystem.roadWidth / 2 - 1.2;
                if (this.playerCar.position.x < -halfRoad) {
                    this.playerCar.position.x = -halfRoad;
                    this.playerCar.speed *= 0.95;
                } else if (this.playerCar.position.x > halfRoad) {
                    this.playerCar.position.x = halfRoad;
                    this.playerCar.speed *= 0.95;
                }

                this.trackSystem.update(delta, this.playerCar);
                this.updateCamera();
                this.updateHUD();
                this.updateMinimap();
            }

            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }
    }

    // Attach to global window
    window.ApexVelocityGame = ApexVelocityGame;

    function initGame() {
        if (typeof THREE === 'undefined') {
            console.error('Three.js failed to load. Retrying in 500ms...');
            setTimeout(initGame, 500);
            return;
        }
        try {
            window.game = new ApexVelocityGame();
            console.log('🏎️ APEX VELOCITY 4K initialized successfully!');
        } catch (err) {
            console.error('Error starting game:', err);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }
})();
