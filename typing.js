// Nitro Typist Typing Engine & Word Progression System

export class TypingEngine {
    constructor(soundEngine = null) {
        this.soundEngine = soundEngine;

        // Word Dictionaries
        this.dictionaries = {
            speed: [
                'apex', 'drift', 'nitro', 'turbo', 'speed', 'boost', 'clutch', 'shift', 'brake',
                'track', 'hyper', 'torque', 'motor', 'pedal', 'revs', 'smoke', 'spool', 'flame',
                'wheel', 'power', 'piston', 'valve', 'gear', 'tires', 'racer', 'grid', 'steer',
                'gauge', 'draft', 'slick', 'pace', 'lead', 'fast', 'dash', 'burn', 'corner',
                'rpm', 'flow', 'grip', 'drive', 'fuel', 'boost', 'overtake', 'victory', 'asphalt'
            ],
            cyber: [
                'matrix', 'cyber', 'neon', 'vector', 'telemetry', 'quantum', 'protocol', 'neural',
                'overdrive', 'system', 'binary', 'glitch', 'terminal', 'network', 'uplink', 'hacker',
                'silicon', 'digital', 'circuit', 'laser', 'proxy', 'latency', 'bandwidth', 'firewall',
                'subroutine', 'algorithm', 'nanotech', 'interface', 'synthetic', 'hyperdrive', 'gridline'
            ],
            supercar: [
                'aerodynamic', 'turbocharged', 'transmission', 'combustion', 'downforce',
                'supercharger', 'differential', 'carbonfiber', 'suspension', 'caliper',
                'monocoque', 'horsepower', 'intercooler', 'manifold', 'tachometer',
                'telemetry', 'displacement', 'synchronizer', 'camber', 'radiator', 'aerofoil'
            ],
            quotes: [
                'hit the apex cleanly',
                'shift gears into overdrive',
                'unleash the twin turbo blast',
                'drift across the neon highway',
                'break through the sound barrier',
                'maximum speed achieved',
                'draft behind the rival hypercar',
                'claim the checkered flag in first place'
            ]
        };

        this.currentPack = 'speed';
        this.activeQueue = [];
        this.queueSize = 4;

        // Typing metrics
        this.startTime = null;
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsCompleted = 0;
        this.currentStreak = 0;
        this.highestStreak = 0;

        // Current target word
        this.currentWord = '';
        this.currentInput = '';
        this.hasError = false;

        this.initQueue();
    }

    setPack(packName) {
        if (this.dictionaries[packName]) {
            this.currentPack = packName;
            this.initQueue();
        }
    }

    getRandomWord() {
        const list = this.dictionaries[this.currentPack];
        return list[Math.floor(Math.random() * list.length)];
    }

    initQueue() {
        this.activeQueue = [];
        for (let i = 0; i < this.queueSize; i++) {
            this.activeQueue.push(this.getRandomWord());
        }
        this.currentWord = this.activeQueue[0];
        this.currentInput = '';
        this.hasError = false;
    }

    startSession() {
        this.startTime = performance.now();
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;
        this.wordsCompleted = 0;
        this.currentStreak = 0;
        this.highestStreak = 0;
        this.initQueue();
    }

    handleKeyInput(key, playerCar = null) {
        if (!this.startTime) this.startSession();

        // Ignore modifier keys
        if (key.length > 1 && key !== 'Backspace' && key !== ' ') return null;

        this.totalKeystrokes++;

        if (key === 'Backspace') {
            if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
                this.hasError = !this.currentWord.startsWith(this.currentInput);
            }
            return { type: 'backspace' };
        }

        const potentialInput = this.currentInput + key;

        if (this.currentWord.startsWith(potentialInput)) {
            // Correct letter!
            this.currentInput = potentialInput;
            this.correctKeystrokes++;
            this.hasError = false;

            // Small boost for each correct letter
            if (playerCar) {
                playerCar.boostFromTyping(0.35);
            }
            if (this.soundEngine) {
                this.soundEngine.playKeyClick(true);
            }

            // Did user complete current word?
            if (this.currentInput === this.currentWord) {
                this.wordsCompleted++;
                this.currentStreak++;
                if (this.currentStreak > this.highestStreak) {
                    this.highestStreak = this.currentStreak;
                }

                // Big Nitro boost on word completion!
                const comboMultiplier = Math.min(1 + Math.floor(this.currentStreak / 5) * 0.5, 3.0);
                if (playerCar) {
                    playerCar.boostFromTyping(1.8 * comboMultiplier);
                }
                if (this.soundEngine) {
                    this.soundEngine.playWordSuccess(comboMultiplier);
                }

                const completedWord = this.currentWord;

                // Advance queue
                this.activeQueue.shift();
                this.activeQueue.push(this.getRandomWord());
                this.currentWord = this.activeQueue[0];
                this.currentInput = '';

                return {
                    type: 'word_completed',
                    word: completedWord,
                    streak: this.currentStreak,
                    combo: comboMultiplier
                };
            }

            return { type: 'correct_letter', char: key };
        } else {
            // Mistyped letter!
            this.hasError = true;
            this.currentStreak = 0;
            if (this.soundEngine) {
                this.soundEngine.playKeyClick(false);
            }
            return { type: 'mistake', char: key };
        }
    }

    getStats() {
        const elapsedMinutes = Math.max(0.01, (performance.now() - (this.startTime || performance.now())) / 60000);
        // Standard formula: 5 characters = 1 word
        const wpm = Math.round((this.correctKeystrokes / 5) / elapsedMinutes);
        const accuracy = this.totalKeystrokes > 0 ?
            Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) : 100;

        return {
            wpm: Math.min(wpm, 240),
            accuracy: accuracy,
            streak: this.currentStreak,
            highestStreak: this.highestStreak,
            wordsCompleted: this.wordsCompleted,
            totalKeys: this.totalKeystrokes
        };
    }

    getDisplayData() {
        const matched = this.currentWord.slice(0, this.currentInput.length);
        const remaining = this.currentWord.slice(this.currentInput.length);
        const nextWords = this.activeQueue.slice(1);

        return {
            currentWord: this.currentWord,
            matched: matched,
            remaining: remaining,
            hasError: this.hasError,
            nextWords: nextWords
        };
    }
}
