// Highway Track, City Skyline, Cyber Environment, and AI Rival System
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SuperCar } from './car.js';

export class TrackSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.theme = options.theme || 'cyber'; // 'cyber' | 'sunset' | 'matrix'
        this.segmentLength = 120;
        this.numSegments = 14;
        this.roadWidth = 24; // 4 wide lanes
        this.segments = [];
        this.sceneryGroup = new THREE.Group();
        this.scene.add(this.sceneryGroup);

        // AI Rivals
        this.aiCars = [];

        // Materials cache
        this.roadMat = null;
        this.barrierMat = null;
        this.laneMarkMat = null;
        this.neonSignMats = [];

        this.initMaterials();
        this.buildInitialTrack();
        this.spawnSkyboxAndCity();
    }

    initMaterials() {
        // High quality asphalt with specular sheen
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x14161d,
            roughness: 0.35,
            metalness: 0.65,
        });

        // Glowing lane markings
        this.laneMarkMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
        });

        // Glowing road side barriers
        this.barrierMat = new THREE.MeshStandardMaterial({
            color: 0x222630,
            metalness: 0.9,
            roughness: 0.2,
        });

        this.barrierLightMat = new THREE.MeshBasicMaterial({
            color: 0xff0055,
        });

        // Neon Billboard Materials
        const neonColors = [0x00ffff, 0xff007f, 0x00ff66, 0xffaa00, 0x9900ff];
        this.neonSignMats = neonColors.map(c => new THREE.MeshBasicMaterial({ color: c }));
    }

    createSegment(zOffset) {
        const seg = new THREE.Group();
        seg.position.z = zOffset;

        // 1. MAIN ROAD SURFACE
        const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength);
        roadGeo.rotateX(-Math.PI / 2);
        const road = new THREE.Mesh(roadGeo, this.roadMat);
        road.receiveShadow = true;
        seg.add(road);

        // 2. DASHED LANE MARKINGS (3 dividing lines for 4 lanes)
        const laneOffsets = [-this.roadWidth * 0.25, 0, this.roadWidth * 0.25];
        const dashCount = 8;
        const dashLen = 6;
        const dashSpacing = this.segmentLength / dashCount;

        laneOffsets.forEach(offsetX => {
            for (let d = 0; d < dashCount; d++) {
                const dashGeo = new THREE.PlaneGeometry(0.3, dashLen);
                dashGeo.rotateX(-Math.PI / 2);
                const dash = new THREE.Mesh(dashGeo, this.laneMarkMat);
                dash.position.set(offsetX, 0.02, -this.segmentLength / 2 + d * dashSpacing + dashLen / 2);
                seg.add(dash);
            }
        });

        // 3. BARRIER GUARD RAILS WITH NEON LED EDGES
        const barrierGeo = new THREE.BoxGeometry(0.8, 1.2, this.segmentLength);
        const neonStripGeo = new THREE.BoxGeometry(0.1, 0.15, this.segmentLength);

        // Left Barrier
        const barrierL = new THREE.Mesh(barrierGeo, this.barrierMat);
        barrierL.position.set(-this.roadWidth / 2 - 0.4, 0.6, 0);
        const neonL = new THREE.Mesh(neonStripGeo, this.barrierLightMat);
        neonL.position.set(-this.roadWidth / 2 + 0.05, 1.1, 0);
        seg.add(barrierL);
        seg.add(neonL);

        // Right Barrier
        const barrierR = new THREE.Mesh(barrierGeo, this.barrierMat);
        barrierR.position.set(this.roadWidth / 2 + 0.4, 0.6, 0);
        const neonR = new THREE.Mesh(neonStripGeo, this.barrierLightMat);
        neonR.position.set(this.roadWidth / 2 - 0.05, 1.1, 0);
        seg.add(barrierR);
        seg.add(neonR);

        // 4. OVERHEAD CYBER ARCHEWAYS / GANTRIES (Occasional)
        if (Math.abs(zOffset) % (this.segmentLength * 2) === 0) {
            const arch = this.createCyberArch();
            arch.position.set(0, 0, 0);
            seg.add(arch);
        }

        // 5. NEON BILLBOARDS ON ROADSIDE
        if (Math.random() > 0.4) {
            const side = Math.random() > 0.5 ? 1 : -1;
            const billboard = this.createNeonBillboard();
            billboard.position.set(side * (this.roadWidth / 2 + 8), 6, (Math.random() - 0.5) * 30);
            billboard.rotation.y = side > 0 ? -Math.PI / 6 : Math.PI / 6;
            seg.add(billboard);
        }

        this.sceneryGroup.add(seg);
        return seg;
    }

    createCyberArch() {
        const arch = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e2029, metalness: 0.9, roughness: 0.3 });
        const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        // Left pillar
        const pillarGeo = new THREE.BoxGeometry(0.8, 8, 1.2);
        const pL = new THREE.Mesh(pillarGeo, frameMat);
        pL.position.set(-this.roadWidth / 2 - 1, 4, 0);
        // Right pillar
        const pR = new THREE.Mesh(pillarGeo, frameMat);
        pR.position.set(this.roadWidth / 2 + 1, 4, 0);

        // Top cross beam
        const beamGeo = new THREE.BoxGeometry(this.roadWidth + 4, 1.0, 1.2);
        const beam = new THREE.Mesh(beamGeo, frameMat);
        beam.position.set(0, 7.8, 0);

        // Glowing neon understrip
        const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(this.roadWidth + 2, 0.15, 0.4), neonMat);
        neonStrip.position.set(0, 7.3, 0);

        arch.add(pL);
        arch.add(pR);
        arch.add(beam);
        arch.add(neonStrip);

        return arch;
    }

    createNeonBillboard() {
        const group = new THREE.Group();
        const frameGeo = new THREE.BoxGeometry(8, 4, 0.4);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111116, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);

        const randomMat = this.neonSignMats[Math.floor(Math.random() * this.neonSignMats.length)];
        const screenGeo = new THREE.PlaneGeometry(7.6, 3.6);
        const screen = new THREE.Mesh(screenGeo, randomMat);
        screen.position.z = 0.22;

        const poleGeo = new THREE.CylinderGeometry(0.4, 0.4, 8);
        const pole = new THREE.Mesh(poleGeo, frameMat);
        pole.position.y = -4;

        group.add(frame);
        group.add(screen);
        group.add(pole);
        return group;
    }

    buildInitialTrack() {
        for (let i = 0; i < this.numSegments; i++) {
            const z = i * this.segmentLength - (this.segmentLength * 2);
            const seg = this.createSegment(z);
            this.segments.push(seg);
        }
    }

    spawnSkyboxAndCity() {
        // Futuristic Skybox / Cyber City Backdrop
        const buildingCount = 80;
        const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
        const bldgMat = new THREE.MeshStandardMaterial({
            color: 0x090b14,
            roughness: 0.2,
            metalness: 0.8,
        });

        this.cityGroup = new THREE.Group();

        for (let i = 0; i < buildingCount; i++) {
            const bldg = new THREE.Mesh(bldgGeo, bldgMat);
            const height = 30 + Math.random() * 90;
            const width = 15 + Math.random() * 25;
            const depth = 15 + Math.random() * 25;

            bldg.scale.set(width, height, depth);
            const side = Math.random() > 0.5 ? 1 : -1;
            const xDist = side * (this.roadWidth / 2 + 35 + Math.random() * 120);
            const zDist = (Math.random() - 0.2) * (this.numSegments * this.segmentLength);

            bldg.position.set(xDist, height / 2, zDist);

            // Add neon window accents on some buildings
            if (Math.random() > 0.3) {
                const winMat = this.neonSignMats[Math.floor(Math.random() * this.neonSignMats.length)];
                const winMesh = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, height * 0.05, depth * 0.9), winMat);
                winMesh.position.set(xDist, height * (0.4 + Math.random() * 0.5), zDist);
                this.cityGroup.add(winMesh);
            }

            this.cityGroup.add(bldg);
        }

        this.sceneryGroup.add(this.cityGroup);
    }

    spawnAIRivals(playerZ) {
        // Create 5 intelligent AI rival cars
        const rivalConfigs = [
            { name: 'PHANTOM-V8', color: 0xff0044, underglow: 0xff0044, speed: 65, wpm: 40, offsetZ: 60, lane: -6 },
            { name: 'VIPER-GT', color: 0xffbb00, underglow: 0xffbb00, speed: 72, wpm: 55, offsetZ: 140, lane: 2 },
            { name: 'NEXUS-TURBO', color: 0x00ff88, underglow: 0x00ff88, speed: 78, wpm: 70, offsetZ: 230, lane: -2 },
            { name: 'KRONOS-9', color: 0x9900ff, underglow: 0x9900ff, speed: 84, wpm: 85, offsetZ: 340, lane: 6 },
            { name: 'TITAN-HYPER', color: 0xffffff, underglow: 0x00e5ff, speed: 90, wpm: 100, offsetZ: 470, lane: 0 }
        ];

        rivalConfigs.forEach(cfg => {
            const aiCar = new SuperCar(this.scene, {
                isAI: true,
                color: cfg.color,
                underglowColor: cfg.underglow,
                name: cfg.name,
                x: cfg.lane,
                z: playerZ + cfg.offsetZ
            });
            aiCar.baseSpeed = cfg.speed;
            aiCar.targetWpm = cfg.wpm;
            aiCar.targetLaneX = cfg.lane;
            this.aiCars.push(aiCar);
        });
    }

    update(delta, playerCar, gameMode = 'arcade', playerWPM = 0) {
        const playerZ = playerCar.position.z;

        // Dynamic infinite track recycling
        this.segments.forEach(seg => {
            // When segment is far behind player, move it forward
            if (seg.position.z < playerZ - this.segmentLength * 2.5) {
                // Find furthest forward segment Z
                let maxZ = -Infinity;
                this.segments.forEach(s => {
                    if (s.position.z > maxZ) maxZ = s.position.z;
                });
                seg.position.z = maxZ + this.segmentLength;
            }
        });

        // City backdrop follows player so skyline stays continuous
        if (this.cityGroup) {
            this.cityGroup.position.z = playerZ * 0.7; // Parallax effect
        }

        // Update AI Rivals
        this.aiCars.forEach(ai => {
            let targetSpeed = ai.baseSpeed;

            // In Typing Racer Mode, rival speed is tied directly to their target WPM benchmark!
            if (gameMode === 'typing') {
                targetSpeed = (ai.targetWpm / 60) * 45 + 15; // Speed scaled with WPM
            }

            // AI dynamic lane keeping and slight weave
            if (Math.random() < 0.01) {
                const lanes = [-6, -2, 2, 6];
                ai.targetLaneX = lanes[Math.floor(Math.random() * lanes.length)];
            }

            // Steer towards target lane
            const steerDiff = ai.targetLaneX - ai.position.x;
            const aiSteerLeft = steerDiff < -0.3;
            const aiSteerRight = steerDiff > 0.3;

            // Simple AI input
            const aiInput = {
                forward: ai.speed < targetSpeed,
                backward: ai.speed > targetSpeed + 5,
                left: aiSteerLeft,
                right: aiSteerRight,
                nitro: Math.random() < 0.02
            };

            ai.update(delta, aiInput);

            // Keep AI within road bounds
            ai.position.x = Math.max(-this.roadWidth / 2 + 1.5, Math.min(this.roadWidth / 2 - 1.5, ai.position.x));

            // Respawn AI ahead if fallen drastically behind
            if (ai.position.z < playerZ - 120) {
                ai.position.z = playerZ + 250 + Math.random() * 200;
                ai.speed = ai.baseSpeed * 0.8;
            }
        });
    }

    getRacePositions(playerCar) {
        // Sort all cars by Z distance (furthest ahead is 1st)
        const allCars = [
            { isPlayer: true, name: 'PLAYER (YOU)', z: playerCar.position.z, speed: playerCar.getSpeedKmh() }
        ];

        this.aiCars.forEach(ai => {
            allCars.push({
                isPlayer: false,
                name: ai.name,
                z: ai.position.z,
                speed: ai.getSpeedKmh(),
                targetWpm: ai.targetWpm
            });
        });

        allCars.sort((a, b) => b.z - a.z);

        const playerRank = allCars.findIndex(c => c.isPlayer) + 1;
        return {
            rank: playerRank,
            total: allCars.length,
            leaderboard: allCars
        };
    }
}
