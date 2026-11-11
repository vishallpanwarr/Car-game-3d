// Procedural 3D Supercar Model & Physics Simulation
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export class SuperCar {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.isAI = options.isAI || false;
        this.color = options.color || 0x00f0ff; // Default Cyber Cyan
        this.underglowColor = options.underglowColor || 0x00f0ff;
        this.name = options.name || 'APEX-GT';

        // Physics & Motion State
        this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
        this.rotation = new THREE.Euler(0, options.rotationY || 0, 0, 'YXZ');
        this.speed = 0; // Current speed in m/s (1 m/s = 3.6 km/h)
        this.maxSpeed = this.isAI ? 70 : 88; // ~316 km/h base
        this.nitroMaxSpeed = 115; // ~414 km/h with Nitro
        this.acceleration = 24.0;
        this.braking = 38.0;
        this.friction = 4.2;
        this.steeringAngle = 0;
        this.maxSteeringAngle = 0.55;
        this.steeringSpeed = 3.2;
        this.driftFactor = 0;
        this.lateralVelocity = 0;
        this.targetLaneX = this.position.x;

        // Gear & RPM simulation
        this.gear = 1;
        this.rpm = 900;
        this.isNitroActive = false;
        this.nitroFuel = 100; // 0 to 100%
        this.isDrifting = false;

        // 3D Objects
        this.mesh = new THREE.Group();
        this.bodyMesh = null;
        this.wheels = [];
        this.frontWheels = [];
        this.exhaustFlames = [];
        this.headlights = [];
        this.taillights = [];
        this.underglowLight = null;

        this.buildCarModel();
        this.scene.add(this.mesh);
    }

    buildCarModel() {
        // High quality PBR materials
        const carPaintMat = new THREE.MeshStandardMaterial({
            color: this.color,
            metalness: 0.88,
            roughness: 0.18,
            envMapIntensity: 1.5,
        });
        this.carPaintMat = carPaintMat;

        const carbonFiberMat = new THREE.MeshStandardMaterial({
            color: 0x111115,
            metalness: 0.4,
            roughness: 0.6,
        });

        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x0a101d,
            metalness: 0.2,
            roughness: 0.05,
            transmission: 0.85,
            transparent: true,
            opacity: 0.9,
            reflectivity: 0.95,
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            metalness: 0.95,
            roughness: 0.1,
        });

        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.85,
            metalness: 0.1,
        });

        const neonEmissionMat = new THREE.MeshBasicMaterial({
            color: this.color,
        });

        // 1. MAIN CHASSIS / LOWER BODY
        const lowerBodyGeo = new THREE.BoxGeometry(1.9, 0.4, 4.2);
        const lowerBody = new THREE.Mesh(lowerBodyGeo, carPaintMat);
        lowerBody.position.y = 0.35;
        lowerBody.castShadow = true;
        lowerBody.receiveShadow = true;
        this.mesh.add(lowerBody);
        this.bodyMesh = lowerBody;

        // 2. SLEEK COCKPIT CABIN & ROOF
        const cabinGeo = new THREE.BoxGeometry(1.4, 0.5, 2.0);
        const cabin = new THREE.Mesh(cabinGeo, glassMat);
        cabin.position.set(0, 0.72, -0.2);
        cabin.castShadow = true;
        this.mesh.add(cabin);

        // Cabin roof cover
        const roofGeo = new THREE.BoxGeometry(1.3, 0.08, 1.8);
        const roof = new THREE.Mesh(roofGeo, carPaintMat);
        roof.position.set(0, 0.97, -0.2);
        this.mesh.add(roof);

        // 3. FRONT HOOD & SPLITTER
        const hoodGeo = new THREE.BoxGeometry(1.8, 0.2, 1.4);
        const hood = new THREE.Mesh(hoodGeo, carPaintMat);
        hood.position.set(0, 0.45, 1.3);
        hood.rotation.x = -0.06;
        this.mesh.add(hood);

        // Carbon fiber front splitter
        const splitterGeo = new THREE.BoxGeometry(2.0, 0.05, 0.4);
        const splitter = new THREE.Mesh(splitterGeo, carbonFiberMat);
        splitter.position.set(0, 0.15, 2.15);
        this.mesh.add(splitter);

        // 4. REAR DIFFUSER & SPOILER (AERODYNAMIC GT WING)
        const diffuserGeo = new THREE.BoxGeometry(1.9, 0.2, 0.5);
        const diffuser = new THREE.Mesh(diffuserGeo, carbonFiberMat);
        diffuser.position.set(0, 0.25, -2.1);
        this.mesh.add(diffuser);

        // Spoiler Wing
        const wingBladeGeo = new THREE.BoxGeometry(2.1, 0.05, 0.45);
        const wingBlade = new THREE.Mesh(wingBladeGeo, carbonFiberMat);
        wingBlade.position.set(0, 1.15, -1.9);

        const wingPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.15), carbonFiberMat);
        wingPillarL.position.set(-0.6, 0.9, -1.9);
        const wingPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.15), carbonFiberMat);
        wingPillarR.position.set(0.6, 0.9, -1.9);

        this.mesh.add(wingBlade);
        this.mesh.add(wingPillarL);
        this.mesh.add(wingPillarR);

        // 5. HEADLIGHTS & TAILLIGHTS
        const headLampGeo = new THREE.BoxGeometry(0.4, 0.08, 0.1);
        const headLampMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff });

        const headLightL = new THREE.Mesh(headLampGeo, headLampMat);
        headLightL.position.set(-0.7, 0.42, 2.08);
        const headLightR = new THREE.Mesh(headLampGeo, headLampMat);
        headLightR.position.set(0.7, 0.42, 2.08);
        this.mesh.add(headLightL);
        this.mesh.add(headLightR);

        // Spotlights projecting beam forward for player car
        if (!this.isAI) {
            const spotLightL = new THREE.SpotLight(0xcdefff, 3.0, 60, Math.PI / 6, 0.4, 1.2);
            spotLightL.position.set(-0.7, 0.45, 2.0);
            spotLightL.target.position.set(-0.7, 0, 30);
            this.mesh.add(spotLightL);
            this.mesh.add(spotLightL.target);

            const spotLightR = new THREE.SpotLight(0xcdefff, 3.0, 60, Math.PI / 6, 0.4, 1.2);
            spotLightR.position.set(0.7, 0.45, 2.0);
            spotLightR.target.position.set(0.7, 0, 30);
            this.mesh.add(spotLightR);
            this.mesh.add(spotLightR.target);
        }

        // Cyber LED Tail Strip (Brake lights)
        const tailLampGeo = new THREE.BoxGeometry(1.7, 0.06, 0.08);
        this.tailLampMat = new THREE.MeshBasicMaterial({ color: 0xff1030 });
        const tailLight = new THREE.Mesh(tailLampGeo, this.tailLampMat);
        tailLight.position.set(0, 0.52, -2.12);
        this.mesh.add(tailLight);

        // 6. WHEELS WITH ALLOY RIMS & BRAKE CALIPERS
        const wheelRadius = 0.38;
        const wheelWidth = 0.32;
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
        wheelGeo.rotateZ(Math.PI / 2);

        const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.75, wheelRadius * 0.75, wheelWidth + 0.02, 16);
        rimGeo.rotateZ(Math.PI / 2);

        const wheelPositions = [
            { x: -0.96, y: 0.38, z: 1.35, isFront: true },  // Front Left
            { x: 0.96, y: 0.38, z: 1.35, isFront: true },   // Front Right
            { x: -0.98, y: 0.40, z: -1.35, isFront: false }, // Rear Left
            { x: 0.98, y: 0.40, z: -1.35, isFront: false }   // Rear Right
        ];

        wheelPositions.forEach((pos) => {
            const wheelAnchor = new THREE.Group();
            wheelAnchor.position.set(pos.x, pos.y, pos.z);

            const tire = new THREE.Mesh(wheelGeo, tireMat);
            tire.castShadow = true;
            const rim = new THREE.Mesh(rimGeo, chromeMat);

            // Glowing brake disc inside rim
            const discGeo = new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, wheelWidth * 0.6, 12);
            discGeo.rotateZ(Math.PI / 2);
            const discMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.3 });
            const disc = new THREE.Mesh(discGeo, discMat);

            wheelAnchor.add(tire);
            wheelAnchor.add(rim);
            wheelAnchor.add(disc);

            this.mesh.add(wheelAnchor);
            this.wheels.push({ anchor: wheelAnchor, mesh: tire, isFront: pos.isFront });
            if (pos.isFront) {
                this.frontWheels.push(wheelAnchor);
            }
        });

        // 7. DUAL EXHAUST PIPES & NITRO FLAME EMITTERS
        const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
        exhaustGeo.rotateX(Math.PI / 2);

        const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
        exhaustL.position.set(-0.4, 0.24, -2.12);
        const exhaustR = new THREE.Mesh(exhaustGeo, chromeMat);
        exhaustR.position.set(0.4, 0.24, -2.12);
        this.mesh.add(exhaustL);
        this.mesh.add(exhaustR);

        // Flame meshes for Nitro
        const flameGeo = new THREE.ConeGeometry(0.12, 0.7, 8);
        flameGeo.rotateX(-Math.PI / 2);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.0,
        });
        this.flameMat = flameMat;

        const flameL = new THREE.Mesh(flameGeo, flameMat);
        flameL.position.set(-0.4, 0.24, -2.5);
        const flameR = new THREE.Mesh(flameGeo, flameMat);
        flameR.position.set(0.4, 0.24, -2.5);
        this.mesh.add(flameL);
        this.mesh.add(flameR);
        this.exhaustFlames.push(flameL, flameR);

        // 8. NEON CHASSIS UNDERGLOW LIGHT
        this.underglowLight = new THREE.PointLight(this.underglowColor, 2.5, 6, 2.0);
        this.underglowLight.position.set(0, 0.12, 0);
        this.mesh.add(this.underglowLight);
    }

    setPaintColor(hexColor) {
        this.color = hexColor;
        if (this.carPaintMat) {
            this.carPaintMat.color.setHex(hexColor);
        }
    }

    setUnderglowColor(hexColor) {
        this.underglowColor = hexColor;
        if (this.underglowLight) {
            this.underglowLight.color.setHex(hexColor);
        }
    }

    update(delta, input = {}, soundEngine = null) {
        const isForward = input.forward || false;
        const isBraking = input.backward || false;
        const isSteerLeft = input.left || false;
        const isSteerRight = input.right || false;
        const isHandbrake = input.handbrake || false;
        const isNitroRequested = input.nitro && this.nitroFuel > 5;

        // Nitro Logic
        if (isNitroRequested && (isForward || this.speed > 10)) {
            this.isNitroActive = true;
            this.nitroFuel = Math.max(0, this.nitroFuel - delta * 25);
            if (this.flameMat) this.flameMat.opacity = 0.95;
            if (soundEngine && Math.random() < 0.1) soundEngine.playNitro();
        } else {
            this.isNitroActive = false;
            // Regenerate nitro slowly when driving fast
            if (!this.isAI && this.speed > 25) {
                this.nitroFuel = Math.min(100, this.nitroFuel + delta * 5);
            }
            if (this.flameMat) this.flameMat.opacity = 0.0;
        }

        // Top Speed target
        const currentMaxSpeed = this.isNitroActive ? this.nitroMaxSpeed : this.maxSpeed;
        const accelMultiplier = this.isNitroActive ? 2.2 : 1.0;

        // Longitudinal Acceleration / Braking
        if (isForward) {
            this.speed += this.acceleration * accelMultiplier * delta;
            if (this.speed > currentMaxSpeed) {
                this.speed = Math.max(this.speed - this.friction * 2 * delta, currentMaxSpeed);
            }
        } else if (isBraking) {
            if (this.speed > 0.5) {
                this.speed -= this.braking * delta;
                if (this.speed < 0) this.speed = 0;
            } else {
                // Reverse
                this.speed -= this.acceleration * 0.4 * delta;
                if (this.speed < -12) this.speed = -12;
            }
        } else {
            // Natural coasting friction
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.friction * delta);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.friction * delta);
            }
        }

        // Taillights brighten on brake
        if (this.tailLampMat) {
            if (isBraking) {
                this.tailLampMat.color.setHex(0xff0020);
            } else {
                this.tailLampMat.color.setHex(0xaa0515);
            }
        }

        // Steering dynamics with high speed stability & drift
        const targetSteer = (isSteerLeft ? 1 : 0) - (isSteerRight ? 1 : 0);
        this.steeringAngle = THREE.MathUtils.lerp(
            this.steeringAngle,
            targetSteer * this.maxSteeringAngle,
            this.steeringSpeed * delta * 2.5
        );

        // Turn front wheels visual angle
        this.frontWheels.forEach(w => {
            w.rotation.y = this.steeringAngle;
        });

        // Drift calculations
        this.isDrifting = (isHandbrake || (Math.abs(this.steeringAngle) > 0.35 && this.speed > 40));
        const driftGrip = this.isDrifting ? 0.35 : 0.85;

        // Apply car rotation around Y
        if (Math.abs(this.speed) > 0.5) {
            const turnRate = (this.speed / currentMaxSpeed) * this.steeringAngle * 1.8;
            this.rotation.y += turnRate * delta * (this.isDrifting ? 1.4 : 1.0);
        }

        // Forward vector based on rotation
        const forwardVector = new THREE.Vector3(
            Math.sin(this.rotation.y),
            0,
            Math.cos(this.rotation.y)
        );

        // Position update
        this.position.addScaledVector(forwardVector, this.speed * delta);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation.y;

        // Body roll / tilt for intense racing realism
        const rollAngle = -this.steeringAngle * (this.speed / currentMaxSpeed) * 0.12;
        const pitchAngle = (isBraking ? -0.04 : (isForward ? 0.02 : 0)) * (this.speed / currentMaxSpeed);
        this.mesh.rotation.z = rollAngle;
        this.mesh.rotation.x = pitchAngle;

        // Wheel spin animation
        const spinDistance = (this.speed * delta) / 0.38;
        this.wheels.forEach(w => {
            w.anchor.children[0].rotation.x += spinDistance;
        });

        // Compute simulated Gear and RPM
        const speedKmh = Math.abs(this.getSpeedKmh());
        this.calculateGearAndRPM(speedKmh, isForward, soundEngine);

        // Sound Engine Update
        if (soundEngine && !this.isAI) {
            soundEngine.updateEngineSound(this.rpm, this.speed / currentMaxSpeed, isForward);
            soundEngine.updateDriftSound(this.isDrifting ? Math.abs(this.steeringAngle) : 0);
        }

        // Exhaust flame flicker effect
        if (this.isNitroActive) {
            this.exhaustFlames.forEach(flame => {
                const scaleZ = 1.0 + Math.random() * 0.7;
                flame.scale.set(1.0, 1.0, scaleZ);
            });
        }
    }

    calculateGearAndRPM(speedKmh, isAccelerating, soundEngine) {
        const gearThresholds = [0, 45, 90, 145, 210, 280, 360];
        let newGear = 1;
        for (let i = 1; i < gearThresholds.length; i++) {
            if (speedKmh > gearThresholds[i]) {
                newGear = i + 1;
            }
        }

        if (newGear !== this.gear && !this.isAI) {
            if (soundEngine && newGear > this.gear) soundEngine.playGearShift();
            this.gear = newGear;
        }

        // RPM simulation
        const low = gearThresholds[this.gear - 1] || 0;
        const high = gearThresholds[this.gear] || 400;
        const ratio = (speedKmh - low) / Math.max(1, (high - low));
        this.rpm = THREE.MathUtils.lerp(this.rpm, 1000 + ratio * 7500, 0.1);
    }

    getSpeedKmh() {
        return this.speed * 3.6;
    }

    boostFromTyping(intensity = 1.0) {
        // Boost speed and add nitro whenever user types a letter or word!
        this.speed = Math.min(this.nitroMaxSpeed, this.speed + 4.5 * intensity);
        this.nitroFuel = Math.min(100, this.nitroFuel + 8 * intensity);
        this.isNitroActive = true;
        if (this.flameMat) this.flameMat.opacity = 0.95;
    }
}
