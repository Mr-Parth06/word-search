# 🔮 Word Search - Premium Puzzle Game

Word Search is a premium, interactive, and visually stunning single-page web game. It features a space-cosmic aesthetic with glassmorphic panels, neon visual highlights, synthesized web sound effects, fluid grid-scaling, and a canvas confetti engine for celebrating victories.

Live preview your game locally at `http://localhost:8080` (or host it directly on GitHub Pages!).

---

## ✨ Features

- **🎮 Responsive Selection Grid**: Smooth mouse dragging on desktops and swipe touch gestures on mobile devices.
- **🎨 Cosmic Themes**: Seamless toggling between **Cosmic Dark** (default, glowing neon highlights) and **Solar Light** (minimalist warm theme).
- **🎵 Dynamic Audio Synthesizer**: Uses the browser's built-in **Web Audio API** to generate sound tones programmatically (no audio assets required!):
  - Incremental pitches during grid drag.
  - Sweet major-triad chords on successfully finding words.
  - Downward frequency buzzer sweep on selections that do not match.
  - Triumphant victory fanfare.
- **💡 Smart Hints**: Reveals the starting letter of a random unsolved word, flashing it on the grid (with adjustable penalty score).
- **⚡ Auto Grid-Builder & Solver**: Dynamic backtracking algorithm placing words in all 8 directions (horizontal, vertical, diagonal, forward, backward) with automatic grid scaling fitting standard difficulties:
  - **Easy**: 8x8 grid (6 words)
  - **Medium**: 12x12 grid (8 words)
  - **Hard**: 15x15 grid (10 words)
- **🎉 Particle Celebration**: Features a HTML5 Canvas confetti overlay with physics (gravity, wind, tilt angles) running on level clearance.

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 structures.
- **Styles**: Custom Vanilla CSS with HSL colors, CSS Variables, Flexbox/Grid, and responsive media queries.
- **Logic**: Vanilla ES6 JavaScript (Zero dependencies, lightweight, runs entirely offline).

---

## 🚀 How to Run Locally

You can launch a static web server to play the game on your system:

### Option 1: Python
Run this command inside the project directory:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

### Option 2: Node.js (http-server)
Run this command inside the project directory:
```bash
npx http-server -p 8080
```
Then open `http://localhost:8080` in your browser.

---

## 📁 Project Structure

```
word-search-game/
├── index.html     # Application structure & HUD statistics
├── style.css      # CSS styling, glassmorphism, animations, solar/dark themes
├── script.js     # Word search placement algorithms, Web Audio, gestures, canvas confetti
└── README.md      # Game documentation
```

---

## 🌟 Hosting on GitHub Pages

This project is a static site and is **100% compatible with GitHub Pages**:
1. Go to your repository settings on GitHub.
2. Select **Pages** from the sidebar.
3. Set the build source to **Deploy from a branch** and select your main branch (e.g. `main` or `master`), choosing the root `/` folder.
4. Save, and your live game URL will be published in a few minutes!
