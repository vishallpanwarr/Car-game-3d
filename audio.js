// Audio Engine powered by Web Audio API - Zero External Dependencies
export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.isMuted = false;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;

        // Engine Audio nodes
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineOsc3 = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.engineRunning = false;

        // Drift sound nodes
        this.driftNode = null;
        this.driftGain = null;

        // Music state
        this.musicPlaying = false;
        this.musicInterval = null;
        this.musicStep = 0;
        this.musicBpm = 128;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // Music Gain
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

        // Complex multi-oscillator engine synthesis
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc3 = this.ctx.createOscillator();

        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineOsc3.type = 'square';

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
        this.engineFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        const subGain1 = this.ctx.createGain();
        const subGain2 = this.ctx.createGain();
        const subGain3 = this.ctx.createGain();

        subGain1.gain.value = 0.5;
        subGain2.gain.value = 0.35;
        subGain3.gain.value = 0.15;

        this.engineOsc1.connect(subGain1);
        this.engineOsc2.connect(subGain2);
        this.engineOsc3.connect(subGain3);

        subGain1.connect(this.engineFilter);
        subGain2.connect(this.engineFilter);
        subGain3.connect(this.engineFilter);

        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.sfxGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.engineOsc3.start();
        this.engineRunning = true;
    }

    updateEngineSound(rpm, speedRatio, isAccelerating) {
        if (!this.ctx || !this.engineRunning) return;

        const time = this.ctx.currentTime;
        // Base idle frequency ~45Hz, redline ~360Hz
        const baseFreq = 42 + (rpm / 9000) * 280;
        
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, time, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, time, 0.05);
        this.engineOsc3.frequency.setTargetAtTime(baseFreq * 1.5, time, 0.05);

        // Filter opens up as RPM and speed increase
        const filterCutoff = 200 + Math.pow(rpm / 9000, 1.4) * 2200 + (isAccelerating ? 400 : 0);
        this.engineFilter.frequency.setTargetAtTime(filterCutoff, time, 0.05);

        // Volume dynamics
        const targetVol = isAccelerating ? (0.28 + speedRatio * 0.25) : 0.12;
        this.engineGain.gain.setTargetAtTime(targetVol, time, 0.08);
    }

    initDriftSound() {
        if (!this.ctx) return;
        // White noise buffer for tire screech
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
        bandpass.frequency.value = 1100;
        bandpass.Q.value = 3.5;

        this.driftGain = this.ctx.createGain();
        this.driftGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        whiteNoise.connect(bandpass);
        bandpass.connect(this.driftGain);
        this.driftGain.connect(this.sfxGain);

        whiteNoise.start();
    }

    updateDriftSound(driftIntensity) {
        if (!this.driftGain || !this.ctx) return;
        const targetGain = Math.min(Math.max(driftIntensity, 0), 1) * 0.45;
        this.driftGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.04);
    }

    playGearShift() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Exhaust pop / clutch disengage
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playNitro() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Sub bass blast
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(180, now);
        bassOsc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

        bassGain.gain.setValueAtTime(0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        bassOsc.connect(bassGain);
        bassGain.connect(this.sfxGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.45);

        // High frequency whoosh sweep
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.25);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.6);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.65);
    }

    // High quality tactile mechanical keyboard click sound
    playKeyClick(isCorrect = true) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        if (isCorrect) {
            // Crisp mechanical tactile click (Cherry MX Blue style)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const randomPitch = 1600 + Math.random() * 400;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(randomPitch, now);
            osc.frequency.exponentialRampToValueAtTime(randomPitch * 0.4, now + 0.035);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.04);
        } else {
            // Error buzzer tone
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.setValueAtTime(110, now + 0.05);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now);
            osc.stop(now + 0.13);
        }
    }

    // Word completed celebration chime
    playWordSuccess(combo = 1) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * (1 + Math.min(combo * 0.05, 0.4)), now + idx * 0.04);

            gain.gain.setValueAtTime(0.22, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.28);
        });
    }

    // Synthwave procedural procedural dynamic music
    startMusic() {
        if (!this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        this.musicStep = 0;

        const bassNotes = [110, 110, 130.81, 146.83, 98, 98, 123.47, 130.81]; // A2, C3, D3, G2 etc.

        const stepTime = (60 / this.musicBpm) / 4; // 16th note interval

        this.musicInterval = setInterval(() => {
            if (!this.musicPlaying || !this.ctx) return;
            const now = this.ctx.currentTime;
            const step = this.musicStep % 16;

            // Kick drum on 0, 4, 8, 12 (Four-on-the-floor synthwave beat)
            if (step % 4 === 0) {
                const kick = this.ctx.createOscillator();
                const kickGain = this.ctx.createGain();
                kick.frequency.setValueAtTime(150, now);
                kick.frequency.exponentialRampToValueAtTime(35, now + 0.12);
                kickGain.gain.setValueAtTime(0.45, now);
                kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                kick.connect(kickGain);
                kickGain.connect(this.musicGain);
                kick.start(now);
                kick.stop(now + 0.15);
            }

            // Snare / clap on 4, 12
            if (step === 4 || step === 12) {
                const snareNoise = this.ctx.createOscillator();
                const snareGain = this.ctx.createGain();
                snareNoise.type = 'triangle';
                snareNoise.frequency.setValueAtTime(260, now);
                snareNoise.frequency.exponentialRampToValueAtTime(80, now + 0.1);
                snareGain.gain.setValueAtTime(0.2, now);
                snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                snareNoise.connect(snareGain);
                snareGain.connect(this.musicGain);
                snareNoise.start(now);
                snareNoise.stop(now + 0.13);
            }

            // Synth bassline arpeggio
            if (step % 2 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassFilter = this.ctx.createBiquadFilter();
                const bassGain = this.ctx.createGain();

                const noteIdx = Math.floor(this.musicStep / 4) % bassNotes.length;
                const freq = bassNotes[noteIdx];

                bassOsc.type = 'sawtooth';
                bassOsc.frequency.setValueAtTime(freq, now);

                bassFilter.type = 'lowpass';
                bassFilter.frequency.setValueAtTime(450 + (step % 4) * 150, now);
                bassFilter.Q.value = 4;

                bassGain.gain.setValueAtTime(0.18, now);
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepTime * 1.8);

                bassOsc.connect(bassFilter);
                bassFilter.connect(bassGain);
                bassGain.connect(this.musicGain);

                bassOsc.start(now);
                bassOsc.stop(now + stepTime * 2);
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

    setSfxVolume(val) {
        this.sfxVolume = val;
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
        }
    }

    setMusicVolume(val) {
        this.musicVolume = val;
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
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
