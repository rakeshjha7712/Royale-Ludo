/* script.js */
const SFX = {
    ctx: null, enabled: true, volume: 0.5,
    init() { window.AudioContext = window.AudioContext || window.webkitAudioContext; if(!this.ctx) this.ctx = new AudioContext(); },
    play(freq, type, dur, volMultiplier = 1) {
        if(!this.enabled || !this.ctx) return;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        const finalVol = (0.1 * volMultiplier) * (this.volume / 100 * 2); 
        g.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        o.connect(g); g.connect(this.ctx.destination);
        o.start(); o.stop(this.ctx.currentTime + dur);
    },
    roll() { if(!this.enabled) return; for(let i=0; i<6; i++) setTimeout(() => this.play(600 + Math.random()*400, 'square', 0.05, 0.5), i*80); },
    step() { this.play(500, 'sine', 0.1, 0.8); },
    safe() { this.play(1000, 'sine', 0.3, 1); },
    kill() { this.play(150, 'sawtooth', 0.4, 2); if(navigator.vibrate) navigator.vibrate(200); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.play(f, 'square', 0.3, 1), i*150)); }
};

const CONSTANTS = {
    colors: ['red', 'green', 'yellow', 'blue'],
    safeSpots: ['6,1', '2,6', '1,8', '6,12', '8,13', '12,8', '13,6', '8,2'],
    paths: {
        red: [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
        green: [[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
        yellow: [[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
        blue: [[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]]
    }
};

const Game = {
    state: {
        activeColors: [], turnIndex: 0, dice: 0, consecutiveSixes: 0,
        hasRolled: false, animating: false, paused: false,
        tokens: { red:[-1,-1,-1,-1], green:[-1,-1,-1,-1], yellow:[-1,-1,-1,-1], blue:[-1,-1,-1,-1] },
        isComputerMode: true,
        names: { red:'Red', green:'Green', yellow:'Yellow', blue:'Blue' }
    },
    config: { mode: 'computer', count: 2 },
    settings: { timer: true, difficulty: 'hard' },
    timer: { interval: null, timeLeft: 15, maxTime: 15 },

    init() {
        if (document.getElementById('splash-screen')) {
            setTimeout(() => {
                document.getElementById('splash-screen').classList.add('fade-out');
                document.getElementById('home-page').classList.add('active');
                document.getElementById('global-controls').classList.add('visible');
                if(!document.getElementById('theme-toggle').checked) document.body.classList.add('light-mode');
                Game.checkSavedGame();
                Game.renderNameInputs();
            }, 2000);
        }
    },

    // --- NAVIGATION ---
    showSetup() {
        SFX.init();
        document.getElementById('home-page').classList.remove('active');
        document.getElementById('setup-menu').classList.add('active');
        this.renderNameInputs();
    },
    goHome() {
        document.getElementById('setup-menu').classList.remove('active');
        document.getElementById('home-page').classList.add('active');
        this.checkSavedGame();
    },
    checkSavedGame() {
        const save = localStorage.getItem('ludoState');
        if(save) document.getElementById('resume-btn').style.display = 'block';
        else document.getElementById('resume-btn').style.display = 'none';
    },
    toggleSettings(show) {
        const el = document.getElementById('settings-modal');
        if(show) { el.classList.add('open'); this.pauseInternal(true); }
        else { el.classList.remove('open'); this.pauseInternal(false); }
    },
    toggleInfo(show) {
        const el = document.getElementById('info-modal');
        if(show) { 
            el.classList.add('open'); 
            this.pauseInternal(true); 
        } else { 
            el.classList.remove('open'); 
            this.pauseInternal(false); 
        }
    },
    togglePause() {
        if(!document.getElementById('game-screen').classList.contains('active')) return;
        this.state.paused = !this.state.paused;
        const el = document.getElementById('pause-modal');
        if(this.state.paused) { el.classList.add('open'); this.stopTimer(); }
        else { el.classList.remove('open'); this.resumeTimer(); }
    },
    pauseInternal(isPaused) {
        if(!document.getElementById('game-screen').classList.contains('active')) return;
        this.state.paused = isPaused;
        if(isPaused) this.stopTimer();
        else this.resumeTimer();
    },
    quitGame() {
        this.stopTimer();
        this.state.paused = false;
        document.getElementById('pause-modal').classList.remove('open');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('btn-pause').style.display = 'none';
        document.getElementById('home-page').classList.add('active');
        this.stopConfetti();
        this.checkSavedGame();
    },

    // --- SETTINGS ---
    setTheme(isDark) {
        if(isDark) document.body.classList.remove('light-mode');
        else document.body.classList.add('light-mode');
    },
    setSound(isEnabled) { SFX.enabled = isEnabled; },
    setVolume(val) { SFX.volume = val; },
    setDifficulty(val) { this.settings.difficulty = val; },
    setTimerEnabled(isEnabled) {
        this.settings.timer = isEnabled;
        const svg = document.getElementById('timer-svg');
        if(isEnabled) svg.classList.remove('hidden');
        else svg.classList.add('hidden');
    },

    // --- SETUP ---
    setMode(m) {
        this.config.mode = m;
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById(`btn-mode-${m}`).classList.add('selected');
        document.getElementById(`btn-p${this.config.count}`).classList.add('selected');
        this.renderNameInputs();
    },
    setPlayers(n) {
        this.config.count = n;
        [2,3,4].forEach(i => document.getElementById(`btn-p${i}`).classList.remove('selected'));
        document.getElementById(`btn-p${n}`).classList.add('selected');
        this.renderNameInputs();
    },
    renderNameInputs() {
        const container = document.getElementById('name-inputs-container');
        if (!container) return;
        container.innerHTML = '';
        const colors = this.config.count === 2 ? ['red', 'yellow'] : (this.config.count === 3 ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue']);
        
        colors.forEach(c => {
            const row = document.createElement('div');
            row.className = 'player-row';
            const isBot = this.config.mode === 'computer' && c !== 'red';
            const defName = isBot ? `Bot (${c})` : `Player ${c.charAt(0).toUpperCase()+c.slice(1)}`;
            row.innerHTML = `<div class="p-dot c-${c}"></div><input type="text" class="name-field" id="name-${c}" value="${defName}" placeholder="Name">`;
            container.appendChild(row);
        });
    },

    // --- GAME LOOP ---
    initGame(fromSave = false) {
        SFX.init();
        if(!fromSave) {
            this.state.tokens = { red:[-1,-1,-1,-1], green:[-1,-1,-1,-1], yellow:[-1,-1,-1,-1], blue:[-1,-1,-1,-1] };
            this.state.turnIndex = 0;
            this.state.hasRolled = false;
            this.state.animating = false;
            this.state.dice = 1;
            this.state.activeColors = this.config.count === 2 ? ['red', 'yellow'] : (this.config.count === 3 ? ['red', 'green', 'yellow'] : ['red', 'green', 'yellow', 'blue']);
            this.state.isComputerMode = (this.config.mode === 'computer');
            this.state.activeColors.forEach(c => {
                const el = document.getElementById(`name-${c}`);
                this.state.names[c] = el ? el.value : c;
            });
        }

        document.getElementById('setup-menu').classList.remove('active');
        document.getElementById('home-page').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        document.getElementById('btn-pause').style.display = 'flex';
        this.state.paused = false;
        
        this.renderBoard(); 
        requestAnimationFrame(() => {
            this.createTokens();
            this.updateTurnUI();
            this.showToast(fromSave ? "RESUMED" : "GAME START");
            this.updateDiceVisual(this.state.dice);
            if(!fromSave && this.isBotTurn()) setTimeout(() => this.rollDice(), 1500);
        });
    },

    resumeGame() {
        const save = localStorage.getItem('ludoState');
        if(!save) return;
        try {
            const data = JSON.parse(save);
            this.state = data.state;
            this.config = data.config;
            this.initGame(true);
        } catch(e) { console.error(e); localStorage.removeItem('ludoState'); }
    },

    saveGame() { localStorage.setItem('ludoState', JSON.stringify({ state: this.state, config: this.config })); },
    getCurrentColor() { return this.state.activeColors[this.state.turnIndex]; },
    getCurrentName() { return this.state.names[this.getCurrentColor()]; },
    isBotTurn() { return this.state.isComputerMode && this.getCurrentColor() !== 'red'; },

    humanRoll() {
        if(this.state.paused || this.isBotTurn() || this.state.hasRolled || this.state.animating) return;
        this.rollDice();
    },

    rollDice() {
        if(this.state.paused) return;
        this.stopTimer();
        SFX.roll();
        const d = document.getElementById('dice-wrap');
        d.classList.add('rolling');
        const roll = Math.floor(Math.random() * 6) + 1;
        
        setTimeout(() => {
            d.classList.remove('rolling');
            if(this.state.paused) return;
            this.state.dice = roll;
            this.state.hasRolled = true;
            this.updateDiceVisual(roll);
            
            if(roll === 6) {
                this.state.consecutiveSixes++;
                if(this.state.consecutiveSixes === 3) {
                    this.showToast("3x SIXES! SKIP");
                    setTimeout(() => this.nextTurn(), 1500);
                    return;
                }
            } else { this.state.consecutiveSixes = 0; }
            this.checkMoves(roll);
        }, 500);
    },

    updateDiceVisual(num) {
        const cube = document.getElementById('dice-cube');
        const rot = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateX(0deg) rotateY(-90deg)', 3: 'rotateX(0deg) rotateY(-180deg)', 4: 'rotateX(0deg) rotateY(90deg)', 5: 'rotateX(-90deg) rotateY(0deg)', 6: 'rotateX(90deg) rotateY(0deg)' };
        cube.style.transform = rot[num];
    },

    checkMoves(roll) {
        const color = this.getCurrentColor();
        let validMoves = [];
        this.state.tokens[color].forEach((pos, i) => {
            const t = document.getElementById(`token-${color}-${i}`);
            if(t) t.classList.remove('active');
            let canMove = false;
            if(pos === -1 && roll === 6) canMove = true;
            else if(pos !== -1 && pos + roll <= 56) canMove = true;
            if(canMove) {
                validMoves.push(i);
                if(!this.isBotTurn() && t) t.classList.add('active');
            }
        });

        if(validMoves.length === 0) setTimeout(() => this.nextTurn(), 1000);
        else {
            if(this.isBotTurn()) setTimeout(() => this.runBotLogic(validMoves, roll), 800);
            else this.startTimer();
        }
    },

    handleTokenClick(color, idx) {
        if(this.state.paused || this.state.animating || !this.state.hasRolled || this.getCurrentColor() !== color) return;
        const t = document.getElementById(`token-${color}-${idx}`);
        if(!t.classList.contains('active')) return;
        this.executeMove(color, idx);
    },

    executeMove(color, idx) {
        this.stopTimer();
        document.querySelectorAll('.token').forEach(el => el.classList.remove('active'));
        const currentPos = this.state.tokens[color][idx];
        const endPos = (currentPos === -1) ? 0 : currentPos + this.state.dice;
        this.animateMove(color, idx, currentPos, endPos);
    },

    async animateMove(color, idx, start, end) {
        this.state.animating = true;
        const actualStart = (start === -1) ? 0 : start + 1;
        for(let step = actualStart; step <= end; step++) {
            if(this.state.paused) await new Promise(r => { const interval = setInterval(() => { if(!this.state.paused) { clearInterval(interval); r(); } }, 100); });
            this.state.tokens[color][idx] = step;
            this.updateTokenVisual(color, idx);
            SFX.step();
            await new Promise(r => setTimeout(r, 200)); 
        }
        this.finalizeMove(color, idx, end);
    },

    finalizeMove(color, idx, pos) {
        let bonus = false;
        if(pos === 56) {
            SFX.win();
            bonus = true;
            if(this.state.tokens[color].every(p => p === 56)) {
                this.showToast(`${this.state.names[color]} WINS!`);
                this.startConfetti();
                localStorage.removeItem('ludoState');
                return;
            }
        }
        if(pos < 56) {
            const coord = CONSTANTS.paths[color][pos];
            const isSafe = CONSTANTS.safeSpots.includes(`${coord[0]},${coord[1]}`);
            if(!isSafe) {
                this.state.activeColors.forEach(opp => {
                    if(opp === color) return;
                    this.state.tokens[opp].forEach((opPos, i) => {
                        if(opPos < 56 && opPos > -1) {
                            const opCoord = CONSTANTS.paths[opp][opPos];
                            if(opCoord[0] === coord[0] && opCoord[1] === coord[1]) {
                                SFX.kill();
                                this.showToast("KNOCKOUT!");
                                this.state.tokens[opp][i] = -1; 
                                this.updateTokenVisual(opp, i);
                                bonus = true;
                            }
                        }
                    });
                });
            } else if(pos > 0) SFX.safe();
        }

        this.state.animating = false;
        this.refreshAllTokens();
        this.saveGame();

        if((this.state.dice === 6 || bonus) && this.state.consecutiveSixes < 3) {
            this.state.hasRolled = false;
            this.showToast(bonus ? "BONUS TURN" : "ROLL AGAIN");
            if(this.isBotTurn()) setTimeout(() => this.rollDice(), 1000);
            else this.startTimer();
        } else this.nextTurn();
    },

    nextTurn() {
        this.stopTimer();
        this.state.turnIndex = (this.state.turnIndex + 1) % this.state.activeColors.length;
        this.state.hasRolled = false;
        this.state.dice = 0;
        this.state.consecutiveSixes = 0;
        this.saveGame();
        this.updateTurnUI();
        if(this.isBotTurn()) setTimeout(() => this.rollDice(), 1000);
    },

    runBotLogic(moves, roll) {
        const color = this.getCurrentColor();
        if(this.settings.difficulty === 'easy') {
            this.executeMove(color, moves[Math.floor(Math.random() * moves.length)]);
            return;
        }
        let bestMove = moves[0];
        let maxScore = -9999;

        moves.forEach(idx => {
            let score = 0;
            const curr = this.state.tokens[color][idx];
            const next = (curr === -1) ? 0 : curr + roll;
            let nextCoord = null;
            let isSafe = false;
            if(next < 56) {
                nextCoord = CONSTANTS.paths[color][next];
                isSafe = CONSTANTS.safeSpots.includes(`${nextCoord[0]},${nextCoord[1]}`);
            }
            if(next === 56) score += 200;
            if(next < 56 && !isSafe) {
                let killCount = 0;
                this.state.activeColors.forEach(opp => {
                    if(opp !== color) {
                        this.state.tokens[opp].forEach(p => {
                            if(p > -1 && p < 56) {
                                const opC = CONSTANTS.paths[opp][p];
                                if(opC[0] === nextCoord[0] && opC[1] === nextCoord[1]) killCount++;
                            }
                        });
                    }
                });
                if(killCount > 0) score += 150;
            }
            if(curr === -1) score += 80;
            if(isSafe && curr > -1) score += 60;
            score += (next - curr);
            score += Math.random() * 5;
            if(score > maxScore) { maxScore = score; bestMove = idx; }
        });
        this.executeMove(color, bestMove);
    },

    renderBoard() {
        const b = document.getElementById('board');
        // Keep token layer, clear rest
        const tl = document.getElementById('token-layer');
        b.innerHTML = '';
        b.appendChild(tl);

        for(let r=0; r<15; r++) {
            for(let c=0; c<15; c++) {
                if(r<6 && c<6) { this.drawBase(b, 'red', 0, 0); continue; }
                if(r<6 && c>8) { this.drawBase(b, 'green', 0, 9); continue; }
                if(r>8 && c>8) { this.drawBase(b, 'yellow', 9, 9); continue; }
                if(r>8 && c<6) { this.drawBase(b, 'blue', 9, 0); continue; }
                
                if(r>=6 && r<=8 && c>=6 && c<=8) { 
                    if(r===6 && c===6) {
                        const center = document.createElement('div');
                        center.className = 'center-home';
                        center.innerHTML = `<div class="tri" style="background:var(--green)"></div><div class="tri" style="background:var(--red)"></div><div class="tri" style="background:var(--blue)"></div><div class="tri" style="background:var(--yellow)"></div><div class="center-trophy">🏆</div>`;
                        b.appendChild(center);
                    }
                    continue; 
                }

                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `cell-${r}-${c}`;
                if(r===7 && c>0 && c<6) { cell.classList.add('c-red'); if(c>0) cell.style.opacity = '0.3'; }
                if(c===7 && r>0 && r<6) { cell.classList.add('c-green'); if(r>0) cell.style.opacity = '0.3'; }
                if(r===7 && c>8 && c<14) { cell.classList.add('c-yellow'); if(c<14) cell.style.opacity = '0.3'; }
                if(c===7 && r>8 && r<14) { cell.classList.add('c-blue'); if(r<14) cell.style.opacity = '0.3'; }
                if(r===6 && c===1) { cell.classList.add('c-red', 'start-cell', 'arrow'); cell.style.opacity = '1'; }
                if(r===1 && c===8) { cell.classList.add('c-green', 'start-cell', 'arrow'); cell.style.opacity = '1'; }
                if(r===8 && c===13) { cell.classList.add('c-yellow', 'start-cell', 'arrow'); cell.style.opacity = '1'; }
                if(r===13 && c===6) { cell.classList.add('c-blue', 'start-cell', 'arrow'); cell.style.opacity = '1'; }
                if(['2,6','6,12','12,8','8,2'].includes(`${r},${c}`)) cell.classList.add('safe');
                if((r===6 && c>0 && c<6) || (r===5 && c===1) || (r===7 && c<6)) cell.classList.add('path-red');
                if((c===8 && r<6) || (c===7 && r<6) || (c===6 && r===1)) cell.classList.add('path-green');
                if((r===8 && c>8) || (r===7 && c>8) || (r===9 && c===13)) cell.classList.add('path-yellow');
                if((c===6 && r>8) || (c===7 && r>8) || (c===8 && r===13)) cell.classList.add('path-blue');
                cell.style.gridRow = r+1; cell.style.gridColumn = c+1;
                b.appendChild(cell);
            }
        }
    },

    drawBase(b, color, r, c) {
        const active = this.state.activeColors.includes(color);
        const base = document.createElement('div');
        base.className = `base`;
        base.style.borderColor = `var(--${color})`;
        base.style.background = `var(--${color})`;
        base.style.gridRow = `${r+1} / span 6`; base.style.gridColumn = `${c+1} / span 6`;
        base.style.opacity = active ? 1 : 0.4;
        if(active) {
            const inner = document.createElement('div');
            inner.className = 'base-inner';
            for(let i=0; i<4; i++) {
                const s = document.createElement('div');
                s.className = 'base-spot';
                s.id = `base-${color}-${i}`;
                inner.appendChild(s);
            }
            base.appendChild(inner);
        }
        b.appendChild(base);
    },

    createTokens() {
        const l = document.getElementById('token-layer');
        l.innerHTML = '';
        this.state.activeColors.forEach(c => {
            for(let i=0; i<4; i++) {
                const t = document.createElement('div');
                t.className = `token c-${c} no-transition`;
                t.id = `token-${c}-${i}`;
                t.onclick = () => this.handleTokenClick(c, i);
                l.appendChild(t);
            }
        });
        this.refreshAllTokens();
        setTimeout(() => document.querySelectorAll('.token').forEach(t => t.classList.remove('no-transition')), 100);
    },

    refreshAllTokens() {
        this.state.activeColors.forEach(c => { for(let i=0; i<4; i++) this.updateTokenVisual(c, i); });
    },

    updateTokenVisual(color, idx) {
        const pos = this.state.tokens[color][idx];
        const el = document.getElementById(`token-${color}-${idx}`);
        if(!el) return;

        let target, scale = 1;
        // Important: Fixed calculation for Base spots (pos === -1)
        if(pos === -1) target = document.getElementById(`base-${color}-${idx}`);
        else if(pos === 56) { target = document.querySelector('.center-home'); scale = 0.5; }
        else {
            const [r, c] = CONSTANTS.paths[color][pos];
            target = document.getElementById(`cell-${r}-${c}`);
        }

        if(target) {
            el.style.display = 'block';
            // Board is now the relative parent (pos: relative)
            const board = document.getElementById('board');
            const bRect = board.getBoundingClientRect();
            const tRect = target.getBoundingClientRect();
            
            const width = tRect.width * 0.75;
            const height = tRect.height * 0.75;
            
            // Calculate left/top relative to the Board's own rect
            const left = (tRect.left - bRect.left) + (tRect.width - width)/2;
            const top = (tRect.top - bRect.top) + (tRect.height - height)/2;

            el.style.width = `${width}px`;
            el.style.height = `${height}px`;
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            
            const off = this.getStackOffset(color, pos, idx);
            if(!el.classList.contains('active')) {
                // Ensure base tokens (pos -1) have NO offset transform to stay perfectly centered
                if(pos === -1) el.style.transform = `scale(1) translate(0px, 0px)`;
                else el.style.transform = `scale(${scale}) translate(${off.x}px, ${off.y}px)`;
            }
        }
    },

    getStackOffset(color, pos, myIdx) {
        if(pos === -1 || pos === 56) return {x:0, y:0};
        let count = 0, rank = 0;
        this.state.activeColors.forEach(c => {
            this.state.tokens[c].forEach((p, i) => {
                if(p === pos && p > -1 && p < 56) {
                    count++;
                    if(c===color && i < myIdx) rank++;
                    else if(this.state.activeColors.indexOf(c) < this.state.activeColors.indexOf(color)) rank++;
                }
            });
        });
        if(count <= 1) return {x:0, y:0};
        const map = [{x:-3,y:-3}, {x:3,y:3}, {x:-3,y:3}, {x:3,y:-3}, {x:0,y:0}];
        return map[rank % 5];
    },

    updateTurnUI() {
        const c = this.getCurrentColor();
        const cp = document.getElementById('control-panel');
        cp.classList.remove('pos-red', 'pos-green', 'pos-yellow', 'pos-blue');
        cp.classList.add(`pos-${c}`);
        document.getElementById('current-player-label').innerText = this.getCurrentName();
        document.getElementById('current-player-label').style.color = `var(--${c})`;
        if(this.isBotTurn()) cp.style.cursor = 'default';
        else { cp.style.cursor = 'pointer'; this.startTimer(); }
    },

    startTimer() {
        this.stopTimer();
        if(!this.settings.timer) return; 
        this.timer.timeLeft = this.timer.maxTime;
        this.updateTimerVisual();
        if(this.isBotTurn()) return;
        this.timer.interval = setInterval(() => {
            if(this.state.paused) return;
            this.timer.timeLeft--;
            this.updateTimerVisual();
            if(this.timer.timeLeft <= 0) { this.showToast("TIMEOUT!"); this.nextTurn(); }
        }, 1000);
    },
    resumeTimer() { if(!this.settings.timer || this.isBotTurn() || this.state.hasRolled) return; if(!this.timer.interval) this.startTimer(); },
    stopTimer() { clearInterval(this.timer.interval); this.timer.interval = null; },
    updateTimerVisual() { const offset = 283 - (this.timer.timeLeft / this.timer.maxTime) * 283; document.getElementById('timer-ring').style.strokeDashoffset = offset; },
    showToast(msg) { const t = document.getElementById('toast'); t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); },
    
    // --- CONFETTI ---
    confettiLoop: null,
    startConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const particles = [];
        const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];
        for(let i=0; i<200; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, c: colors[Math.floor(Math.random()*colors.length)], d: Math.random() * 10 + 5, s: Math.random() * 5 + 2 });
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); p.y += p.s; p.x += Math.sin(p.y/20); if(p.y > canvas.height) p.y = -10; });
            this.confettiLoop = requestAnimationFrame(draw);
        };
        draw();
        setTimeout(() => this.stopConfetti(), 5000);
    },
    stopConfetti() { if(this.confettiLoop) cancelAnimationFrame(this.confettiLoop); document.getElementById('confetti-canvas').getContext('2d').clearRect(0,0,window.innerWidth, window.innerHeight); }
};

window.onload = Game.init;
window.onresize = () => { Game.refreshAllTokens(); };