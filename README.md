# B2B-Chess: Local Bot-vs-Bot Chess with HTML and Node.js

This project allows you to watch two chess engines (UCI bots) play against each other locally, with a web-based graphical board.

## Features
- Local engine-vs-engine chess (Stockfish, Fairy-Stockfish, etc.)
- Web-based graphical board using HTML, CSS, and JavaScript
- Real-time display of moves and game state in your browser
- Supports various UCI-compatible chess engines

## Prerequisites
- Node.js (LTS version recommended)
- npm (comes with Node.js)
- Two UCI-compatible chess engines (e.g., Stockfish, Fairy-Stockfish)

## Setup

### 1. Download chess engines
- Download Stockfish: https://stockfishchess.org/download/
- Download Fairy-Stockfish: https://github.com/ianfab/Fairy-Stockfish/releases
- Place the engine executables in the `bots/` folder (e.g., `bots/stockfish-windows-x86-64-avx2.exe`)

### 2. Install dependencies
```bash
npm install
```

### 3. Run the server
```bash
node server.js
```

### 4. Open in your browser
- After starting the server, open your web browser and navigate to `http://localhost:3000` (or the port indicated in the server output).

You will see a graphical chessboard, and the bots will start playing against each other.

## Notes
- The `server.js` file handles the communication with the UCI engines and serves the web interface.
- Chess piece images are located in `public/img/chesspieces/wikipedia/`.
- You can modify `server.js` to change engine paths, game rules, or other settings.