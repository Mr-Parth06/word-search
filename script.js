/**
 * Word Search - JavaScript Engine
 * Handles word search grid generation, drag gesture tracking, sound synthesis, 
 * confetti animations, theme toggle, and game state management.
 */

// --- Word Lists Categories ---
const WORD_CATEGORIES = {
    space: {
        name: "Space",
        words: ["NEBULA", "GALAXY", "COMET", "PLANET", "METEOR", "GRAVITY", "ORBIT", "STAR", "ECLIPSE", "COSMOS", "APOLLO", "SPUTNIK"]
    },
    animals: {
        name: "Animals",
        words: ["DOLPHIN", "CHEETAH", "GIRAFFE", "ELEPHANT", "PENGUIN", "KANGAROO", "PANTHER", "PLATYPUS", "FALCON", "OCTOPUS", "KOALA", "CHAMELEON"]
    },
    tech: {
        name: "Technology",
        words: ["INTERNET", "DATABASE", "ALGORITHM", "COMPUTER", "SOFTWARE", "HARDWARE", "GRAPHICS", "NETWORK", "FIREWALL", "PROTOCOL", "PYTHON", "MATRIX"]
    },
    food: {
        name: "Food",
        words: ["CHOCOLATE", "SPAGHETTI", "AVOCADO", "CROISSANT", "BLUEBERRY", "PINEAPPLE", "SANDWICH", "PANCAKE", "CHEESECAKE", "LASAGNA", "BURGER", "ESPRESSO"]
    },
    cities: {
        name: "Cities",
        words: ["TOKYO", "LONDON", "PARIS", "NEWYORK", "SYDNEY", "CAIRO", "MUMBAI", "TORONTO", "BERLIN", "ROME", "SINGAPORE", "RIO"]
    },
    nature: {
        name: "Nature",
        words: ["FOREST", "WATERFALL", "MOUNTAIN", "CANYON", "DESERT", "VOLCANO", "GLACIER", "MEADOW", "RIVER", "RAINBOW", "HURRICANE", "BLOSSOM"]
    }
};

// --- Game Settings ---
const DIFFICULTY_CONFIG = {
    easy: { size: 8, wordCount: 6 },
    medium: { size: 12, wordCount: 8 },
    hard: { size: 15, wordCount: 10 }
};

// --- Game State Variables ---
let currentCategory = "space";
let currentDifficulty = "medium";
let gridSize = 12;
let gridLetters = []; // 2D array of letters
let placedWords = []; // Array of { word, start: {r,c}, end: {r,c}, coords: [{r,c}] }
let foundWords = new Set(); // Set of found words (in uppercase)
let selectionPath = []; // Array of {r, c} currently dragged
let isDragging = false;
let startCell = null;

// Game Statistics
let score = 0;
let timeElapsed = 0; // in seconds
let timerInterval = null;
let isPaused = false;
let hintCount = 3;
let isMuted = false;

// Audio Synthesizer
let audioCtx = null;

// Visual Colors for Completed Words Highlight
const NEON_COLORS = [
    { bg: "rgba(255, 46, 99, 0.22)", border: "#ff2e63" },   // Pink
    { bg: "rgba(0, 245, 255, 0.22)", border: "#00f5ff" },   // Cyan
    { bg: "rgba(57, 255, 20, 0.22)", border: "#39ff14" },   // Green
    { bg: "rgba(255, 204, 0, 0.22)", border: "#ffcc00" },   // Yellow
    { bg: "rgba(255, 110, 0, 0.22)", border: "#ff6e00" },   // Orange
    { bg: "rgba(180, 0, 255, 0.22)", border: "#b400ff" }    // Purple
];
let colorIndex = 0;

// Confetti Particle Engine
let confettiActive = false;
let confettiParticles = [];
const CONFETTI_CANVAS = document.getElementById("confettiCanvas");
const CONFETTI_CTX = CONFETTI_CANVAS.getContext("2d");

// --- Sound Synthesizer Class ---
class SoundSynth {
    static init() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
    }

    static playTone(freq, duration, type = "sine", delay = 0) {
        if (isMuted) return;
        this.init();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + delay);
        // Exponential decay
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
    }

    static playSelect(step) {
        // Play a short tone that goes up as selection expands
        const baseFreq = 261.63; // C4
        const freq = baseFreq * Math.pow(1.059, step); // chromatic scale steps
        this.playTone(freq, 0.1, "sine");
    }

    static playSuccess() {
        // Play major triad arpeggio
        const C5 = 523.25;
        const E5 = 659.25;
        const G5 = 783.99;
        const C6 = 1046.50;

        this.playTone(C5, 0.2, "triangle", 0);
        this.playTone(E5, 0.2, "triangle", 0.08);
        this.playTone(G5, 0.2, "triangle", 0.16);
        this.playTone(C6, 0.4, "sine", 0.24);
    }

    static playError() {
        // Low buzzer tone sliding down
        if (isMuted) return;
        this.init();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(70, audioCtx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
    }

    static playVictory() {
        // Triumphant rising scale melody
        const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
        notes.forEach((freq, idx) => {
            const delay = idx * 0.08;
            const duration = idx === notes.length - 1 ? 0.6 : 0.15;
            this.playTone(freq, duration, idx === notes.length - 1 ? "sine" : "triangle", delay);
        });
    }
}

// --- Initialization & Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    setupCategories();
    createBackgroundParticles();
    
    // Bind buttons
    document.getElementById("restartBtn").addEventListener("click", () => startNewGame());
    document.getElementById("themeToggle").addEventListener("click", toggleTheme);
    document.getElementById("soundToggle").addEventListener("click", toggleSound);
    document.getElementById("difficultySelect").addEventListener("click", () => SoundSynth.init());
    document.getElementById("difficultySelect").addEventListener("change", (e) => {
        currentDifficulty = e.target.value;
        startNewGame();
    });
    
    document.getElementById("hintBtn").addEventListener("click", triggerHint);
    document.getElementById("pauseBtn").addEventListener("click", togglePause);
    document.getElementById("resumeBtn").addEventListener("click", () => togglePause(false));
    document.getElementById("modalRestartBtn").addEventListener("click", () => {
        document.getElementById("winModal").classList.remove("active");
        stopConfetti();
        startNewGame();
    });

    // Handle board gestures
    const board = document.getElementById("wordGrid");
    
    // Mouse Events
    board.addEventListener("mousedown", handleDragStart);
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);

    // Touch Events (Mobile)
    board.addEventListener("touchstart", handleDragStart, { passive: false });
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd, { passive: false });

    // Handle window resize (relocates highlighting SVG lines)
    window.addEventListener("resize", redrawAllConnections);

    // Initialize Canvas Size
    resizeConfettiCanvas();
    window.addEventListener("resize", resizeConfettiCanvas);

    // Kick off first game
    startNewGame();
});

// Setup sidebar category select buttons
function setupCategories() {
    const container = document.getElementById("categoryContainer");
    container.innerHTML = "";
    
    Object.keys(WORD_CATEGORIES).forEach(key => {
        const btn = document.createElement("button");
        btn.classList.add("pill-btn", "shrink-on-click");
        if (key === currentCategory) btn.classList.add("active");
        btn.textContent = WORD_CATEGORIES[key].name;
        btn.addEventListener("click", () => {
            SoundSynth.init();
            if (currentCategory !== key) {
                document.querySelectorAll(".pill-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentCategory = key;
                startNewGame();
            }
        });
        container.appendChild(btn);
    });
}

// --- Background Decoration ---
function createBackgroundParticles() {
    const bg = document.getElementById("bgParticles");
    const count = 15;
    for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.classList.add("particle");
        
        // Random sizes and positions
        const size = Math.random() * 80 + 30;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}vw`;
        p.style.animationDelay = `${Math.random() * 15}s`;
        p.style.animationDuration = `${Math.random() * 15 + 15}s`;
        
        bg.appendChild(p);
    }
}

// --- Game Logic Controllers ---
function startNewGame() {
    // Clear Timer
    clearInterval(timerInterval);
    
    // Set Config
    gridSize = DIFFICULTY_CONFIG[currentDifficulty].size;
    const wordCount = DIFFICULTY_CONFIG[currentDifficulty].wordCount;
    
    // Reset States
    score = 0;
    timeElapsed = 0;
    isPaused = false;
    hintCount = currentDifficulty === "easy" ? 2 : (currentDifficulty === "medium" ? 3 : 4);
    foundWords.clear();
    placedWords = [];
    colorIndex = 0;
    isDragging = false;
    selectionPath = [];
    
    document.getElementById("wordGrid").setAttribute("data-difficulty", currentDifficulty);
    document.getElementById("pauseOverlay").classList.remove("active");
    document.getElementById("winModal").classList.remove("active");
    document.getElementById("pauseBtn").classList.remove("paused");
    stopConfetti();

    // Select subset of words
    const categoryData = WORD_CATEGORIES[currentCategory];
    document.getElementById("activeCategoryName").textContent = categoryData.name;

    // Filter words fitting into grid sizes
    const validWords = categoryData.words.filter(w => w.length <= gridSize);
    // Shuffle and pick subset
    const selectedWords = validWords.sort(() => 0.5 - Math.random()).slice(0, wordCount);

    // Build the grid
    generateWordSearchGrid(selectedWords);

    // Render elements
    renderGridElements();
    renderWordChecklist(selectedWords);
    
    // Reset overlays
    const svgOverlay = document.getElementById("dragOverlay");
    svgOverlay.innerHTML = "";

    // Reset Stat display values
    updateStatsDisplay();

    // Start Timer
    timerInterval = setInterval(() => {
        if (!isPaused) {
            timeElapsed++;
            document.getElementById("timerText").textContent = formatTime(timeElapsed);
        }
    }, 1000);
}

function updateStatsDisplay() {
    document.getElementById("scoreText").textContent = String(score).padStart(3, "0");
    document.getElementById("timerText").textContent = formatTime(timeElapsed);
    document.getElementById("progressText").textContent = `${foundWords.size} / ${placedWords.length}`;
    document.getElementById("wordsCountBadge").textContent = `${placedWords.length - foundWords.size} left`;
    document.getElementById("hintsBadge").textContent = `💡 ${hintCount}`;
}

// Generate puzzle board with backtracking
function generateWordSearchGrid(words) {
    gridLetters = Array(gridSize).fill(null).map(() => Array(gridSize).fill(""));
    
    // Sort words by length descending for better packing
    const sortedWords = [...words].sort((a, b) => b.length - a.length);
    
    const directions = [
        [0, 1],   // R
        [0, -1],  // L
        [1, 0],   // D
        [-1, 0],  // U
        [1, 1],   // DR
        [1, -1],  // DL
        [-1, 1],  // UR
        [-1, -1]  // UL
    ];

    sortedWords.forEach(word => {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 150) {
            attempts++;
            const startR = Math.floor(Math.random() * gridSize);
            const startC = Math.floor(Math.random() * gridSize);
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const dR = dir[0];
            const dC = dir[1];

            // Boundaries check
            const endR = startR + dR * (word.length - 1);
            const endC = startC + dC * (word.length - 1);

            if (endR >= 0 && endR < gridSize && endC >= 0 && endC < gridSize) {
                // Check overlaps
                let fits = true;
                const pathCoords = [];
                
                for (let i = 0; i < word.length; i++) {
                    const r = startR + dR * i;
                    const c = startC + dC * i;
                    if (gridLetters[r][c] !== "" && gridLetters[r][c] !== word[i]) {
                        fits = false;
                        break;
                    }
                    pathCoords.push({ r, c });
                }

                if (fits) {
                    // Place word letters
                    pathCoords.forEach((coord, i) => {
                        gridLetters[coord.r][coord.c] = word[i];
                    });
                    
                    placedWords.push({
                        word: word,
                        start: { r: startR, c: startC },
                        end: { r: endR, c: endC },
                        coords: pathCoords
                    });
                    placed = true;
                }
            }
        }
    });

    // Fill remaining grids with random alphabets
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (gridLetters[r][c] === "") {
                gridLetters[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
            }
        }
    }
}

// Render DOM cells
function renderGridElements() {
    const grid = document.getElementById("wordGrid");
    grid.innerHTML = "";
    
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement("div");
            cell.classList.add("grid-cell");
            cell.textContent = gridLetters[r][c];
            cell.setAttribute("data-row", r);
            cell.setAttribute("data-col", c);
            grid.appendChild(cell);
        }
    }
}

// Render word checklist sidebar
function renderWordChecklist(words) {
    const checklist = document.getElementById("wordsChecklist");
    checklist.innerHTML = "";
    
    words.forEach(word => {
        const item = document.createElement("div");
        item.classList.add("word-item");
        item.setAttribute("data-word", word);
        
        const dot = document.createElement("div");
        dot.classList.add("checkbox-circle");
        
        const label = document.createElement("span");
        label.textContent = word;
        
        item.appendChild(dot);
        item.appendChild(label);
        checklist.appendChild(item);
    });
}

// --- Gesture Select Interactions ---
function getCellFromEvent(e) {
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.classList.contains("grid-cell")) {
        const r = parseInt(el.getAttribute("data-row"));
        const c = parseInt(el.getAttribute("data-col"));
        return { r, c, el };
    }
    return null;
}

function handleDragStart(e) {
    if (isPaused || foundWords.size === placedWords.length) return;
    
    const cell = getCellFromEvent(e);
    if (cell) {
        e.preventDefault(); // Prevents drag defaults or text highlights
        SoundSynth.init();
        isDragging = true;
        startCell = cell;
        selectionPath = [cell];
        cell.el.classList.add("dragging");
        
        SoundSynth.playSelect(0);
    }
}

function handleDragMove(e) {
    if (!isDragging || !startCell) return;
    e.preventDefault();
    
    const currentCell = getCellFromEvent(e);
    if (!currentCell) return;

    const dR = currentCell.r - startCell.r;
    const dC = currentCell.c - startCell.c;

    // Check validity of line angle (8 directions)
    const absR = Math.abs(dR);
    const absC = Math.abs(dC);
    
    const isValidDir = (dR === 0 && dC !== 0) || // horizontal
                       (dC === 0 && dR !== 0) || // vertical
                       (absR === absC && dR !== 0); // diagonal

    if (isValidDir) {
        const stepR = dR === 0 ? 0 : dR / absR;
        const stepC = dC === 0 ? 0 : dC / absC;
        const steps = Math.max(absR, absC);
        
        const newPath = [];
        for (let i = 0; i <= steps; i++) {
            const r = startCell.r + stepR * i;
            const c = startCell.c + stepC * i;
            const el = document.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
            newPath.push({ r, c, el });
        }

        // Play feedback sounds when selection steps change length
        if (newPath.length !== selectionPath.length) {
            SoundSynth.playSelect(newPath.length - 1);
        }

        // Reset previous dragging cell visual indicators
        selectionPath.forEach(p => {
            if (p.el) p.el.classList.remove("dragging");
        });

        // Set current drag paths
        selectionPath = newPath;
        selectionPath.forEach(p => {
            if (p.el) p.el.classList.add("dragging");
        });

        // Render active drag lines on SVG
        drawSelectionLine();
    }
}

function handleDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    // Retrieve word letters
    const selectWord = selectionPath.map(p => gridLetters[p.r][p.c]).join("");
    const reversedWord = selectWord.split("").reverse().join("");

    let match = null;
    
    // Check match coordinates matching placed word path coordinates
    for (let pw of placedWords) {
        if (pw.word === selectWord || pw.word === reversedWord) {
            // Confirm path coords matches
            const start = selectionPath[0];
            const end = selectionPath[selectionPath.length - 1];
            
            const forwardsMatch = (pw.start.r === start.r && pw.start.c === start.c && pw.end.r === end.r && pw.end.c === end.c);
            const backwardsMatch = (pw.start.r === end.r && pw.start.c === end.c && pw.end.r === start.r && pw.end.c === start.c);
            
            if ((forwardsMatch || backwardsMatch) && !foundWords.has(pw.word)) {
                match = pw;
                break;
            }
        }
    }

    if (match) {
        // Success
        foundWords.add(match.word);
        score += match.word.length * 100;
        
        // Add color highlights lock
        const color = NEON_COLORS[colorIndex % NEON_COLORS.length];
        colorIndex++;

        // Add highlight classes to grid cells
        match.coords.forEach(c => {
            const cell = document.querySelector(`.grid-cell[data-row="${c.r}"][data-col="${c.c}"]`);
            // Lock letter in colored boxes
            cell.style.borderColor = color.border;
            cell.style.boxShadow = `0 0 8px ${color.border}`;
        });

        // Save permanent overlay line
        lockHighlightLine(selectionPath[0], selectionPath[selectionPath.length - 1], color.border);

        // Sidebar Cross-off
        const item = document.querySelector(`.word-item[data-word="${match.word}"]`);
        if (item) item.classList.add("found");

        SoundSynth.playSuccess();
        updateStatsDisplay();

        // Check level completion win
        if (foundWords.size === placedWords.length) {
            handleLevelComplete();
        }
    } else {
        // Play error buzzer and clean selections
        if (selectionPath.length > 1) {
            SoundSynth.playError();
        }
    }

    // Clear dragging visual styles
    selectionPath.forEach(p => {
        if (p.el) p.el.classList.remove("dragging");
    });
    selectionPath = [];
    
    // Clear dragOverlay line drawing
    const overlay = document.getElementById("dragOverlay");
    const activeLine = overlay.querySelector(".drag-line");
    if (activeLine) activeLine.remove();
}

// --- SVG overlay line drawer ---
function getCellCenter(r, c) {
    const grid = document.getElementById("wordGrid");
    const cell = grid.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
    if (!cell) return { x: 0, y: 0 };
    
    const rect = cell.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    
    return {
        x: rect.left - gridRect.left + rect.width / 2,
        y: rect.top - gridRect.top + rect.height / 2
    };
}

function drawSelectionLine() {
    if (selectionPath.length < 2) return;
    const overlay = document.getElementById("dragOverlay");
    
    let activeLine = overlay.querySelector(".drag-line");
    if (!activeLine) {
        activeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        activeLine.setAttribute("class", "drag-line");
        overlay.appendChild(activeLine);
    }
    
    const start = getCellCenter(selectionPath[0].r, selectionPath[0].c);
    const end = getCellCenter(selectionPath[selectionPath.length - 1].r, selectionPath[selectionPath.length - 1].c);
    
    activeLine.setAttribute("x1", start.x);
    activeLine.setAttribute("y1", start.y);
    activeLine.setAttribute("x2", end.x);
    activeLine.setAttribute("y2", end.y);
}

function lockHighlightLine(startCell, endCell, colorHex) {
    const overlay = document.getElementById("dragOverlay");
    const start = getCellCenter(startCell.r, startCell.c);
    const end = getCellCenter(endCell.r, endCell.c);
    
    const lockedLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lockedLine.setAttribute("class", "locked-line");
    lockedLine.setAttribute("x1", start.x);
    lockedLine.setAttribute("y1", start.y);
    lockedLine.setAttribute("x2", end.x);
    lockedLine.setAttribute("y2", end.y);
    lockedLine.setAttribute("stroke", colorHex);
    
    // Store coordinate parameters on line node for redraws on screen resizing
    lockedLine.setAttribute("data-start-r", startCell.r);
    lockedLine.setAttribute("data-start-c", startCell.c);
    lockedLine.setAttribute("data-end-r", endCell.r);
    lockedLine.setAttribute("data-end-c", endCell.c);
    
    overlay.appendChild(lockedLine);
}

// Redraw highlights when resizing viewport
function redrawAllConnections() {
    const overlay = document.getElementById("dragOverlay");
    const lockedLines = overlay.querySelectorAll(".locked-line");
    
    lockedLines.forEach(line => {
        const startR = parseInt(line.getAttribute("data-start-r"));
        const startC = parseInt(line.getAttribute("data-start-c"));
        const endR = parseInt(line.getAttribute("data-end-r"));
        const endC = parseInt(line.getAttribute("data-end-c"));
        
        const start = getCellCenter(startR, startC);
        const end = getCellCenter(endR, endC);
        
        line.setAttribute("x1", start.x);
        line.setAttribute("y1", start.y);
        line.setAttribute("x2", end.x);
        line.setAttribute("y2", end.y);
    });
}

// --- Hints Solver Feature ---
function triggerHint() {
    if (isPaused || hintCount <= 0 || foundWords.size === placedWords.length) return;
    SoundSynth.init();

    // Find a word that is not yet solved
    const unsolved = placedWords.filter(pw => !foundWords.has(pw.word));
    if (unsolved.length === 0) return;

    // Pick a random unsolved word
    const target = unsolved[Math.floor(Math.random() * unsolved.length)];
    const startCellCoord = target.start;

    // Flash the start cell on grid
    const cellEl = document.querySelector(`.grid-cell[data-row="${startCellCoord.r}"][data-col="${startCellCoord.c}"]`);
    if (cellEl) {
        // Flashing letter cue
        cellEl.style.transition = "none";
        cellEl.style.backgroundColor = "var(--accent-color)";
        cellEl.style.color = "#fff";
        cellEl.style.boxShadow = "0 0 20px var(--accent-color)";
        cellEl.style.transform = "scale(1.2)";

        setTimeout(() => {
            cellEl.style.transition = "var(--transition-smooth)";
            cellEl.style.backgroundColor = "";
            cellEl.style.color = "";
            cellEl.style.boxShadow = "";
            cellEl.style.transform = "";
        }, 1800);
    }

    hintCount--;
    score = Math.max(0, score - 50); // Hint penalty
    SoundSynth.playSelect(8); // High chirp sound
    updateStatsDisplay();
}

// --- Victory Event handlers ---
function handleLevelComplete() {
    clearInterval(timerInterval);
    SoundSynth.playVictory();

    // Fill win modal contents
    document.getElementById("modalCategory").textContent = WORD_CATEGORIES[currentCategory].name;
    document.getElementById("modalDifficulty").textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
    document.getElementById("modalTime").textContent = formatTime(timeElapsed);
    document.getElementById("modalScore").textContent = score;

    // Trigger Win Modal display
    setTimeout(() => {
        document.getElementById("winModal").classList.add("active");
        startConfetti();
    }, 800);
}

// --- Time Formatter Helper ---
function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// --- Pause Handlers ---
function togglePause(shouldPause = null) {
    SoundSynth.init();
    if (foundWords.size === placedWords.length) return; // Ignore pause if won
    
    isPaused = shouldPause !== null ? shouldPause : !isPaused;
    
    const pauseOverlay = document.getElementById("pauseOverlay");
    const pauseBtn = document.getElementById("pauseBtn");
    
    if (isPaused) {
        pauseOverlay.classList.add("active");
        pauseBtn.classList.add("paused");
        document.getElementById("pauseBtnText").textContent = "Resume";
    } else {
        pauseOverlay.classList.remove("active");
        pauseBtn.classList.remove("paused");
        document.getElementById("pauseBtnText").textContent = "Pause";
    }
}

// --- Mute Sound Handler ---
function toggleSound() {
    isMuted = !isMuted;
    const body = document.body;
    if (isMuted) {
        body.classList.add("muted");
    } else {
        body.classList.remove("muted");
        SoundSynth.init();
        SoundSynth.playSelect(4);
    }
}

// --- Light / Dark Themes toggler ---
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("dark-theme")) {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
    } else {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
    }
    // Redraw SVG selections lines to fit light theme coloring
    setTimeout(redrawAllConnections, 100);
}

// --- Confetti celebration canvas implementation ---
function resizeConfettiCanvas() {
    CONFETTI_CANVAS.width = window.innerWidth;
    CONFETTI_CANVAS.height = window.innerHeight;
}

function startConfetti() {
    confettiActive = true;
    confettiParticles = [];
    
    // Spawn initial particles
    const colors = ["#ff2e63", "#00f5ff", "#39ff14", "#ffcc00", "#ff6e00", "#b400ff", "#ffffff"];
    for (let i = 0; i < 150; i++) {
        confettiParticles.push({
            x: Math.random() * CONFETTI_CANVAS.width,
            y: Math.random() * CONFETTI_CANVAS.height - CONFETTI_CANVAS.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * CONFETTI_CANVAS.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngleIncremental: Math.random() * 0.07 + 0.02,
            tiltAngle: 0,
            vy: Math.random() * 3 + 2,
            vx: Math.random() * 2 - 1
        });
    }
    
    requestAnimationFrame(updateConfetti);
}

function updateConfetti() {
    if (!confettiActive) return;
    
    CONFETTI_CTX.clearRect(0, 0, CONFETTI_CANVAS.width, CONFETTI_CANVAS.height);
    
    let finished = true;
    confettiParticles.forEach(p => {
        // Draw particle
        CONFETTI_CTX.beginPath();
        CONFETTI_CTX.lineWidth = p.r;
        CONFETTI_CTX.strokeStyle = p.color;
        CONFETTI_CTX.moveTo(p.x + p.tilt + p.r / 2, p.y);
        CONFETTI_CTX.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        CONFETTI_CTX.stroke();
        
        // Physics update
        p.y += p.vy;
        p.x += p.vx;
        p.tiltAngle += p.tiltAngleIncremental;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        
        // If particle falls off, cycle it up if victory overlay is active
        if (p.y < CONFETTI_CANVAS.height) {
            finished = false;
        } else if (document.getElementById("winModal").classList.contains("active")) {
            p.y = -20;
            p.x = Math.random() * CONFETTI_CANVAS.width;
            finished = false;
        }
    });
    
    if (!finished) {
        requestAnimationFrame(updateConfetti);
    }
}

function stopConfetti() {
    confettiActive = false;
    CONFETTI_CTX.clearRect(0, 0, CONFETTI_CANVAS.width, CONFETTI_CANVAS.height);
}
