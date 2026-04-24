<h1 align="center">B2B-Chess: Local Bot-vs-Bot Chess with HTML and Node.js</h1>
<p align="center">This project allows you to watch two chess engines (UCI bots) play against each other locally, with a web-based graphical board.</p>

<br>

![B2B-Chess](image.png)

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

## Playing Against an LLM

This project includes an MCP-based AI Model player that supports local Ollama models and online OpenRouter models.

### 1. Configure Secrets and Defaults in `.env`

Create a `.env` file in the root of the project and add the following configuration:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=qwen/qwen3-next-80b-a3b-instruct:free

# Optional UI quick-pick list
OPENROUTER_MODELS=qwen/qwen3-next-80b-a3b-instruct:free,openai/gpt-4o-mini
```

Notes:

- `.env` stores secrets and defaults only.
- Per-game selections (player type, provider, model) are chosen in the UI.

### 2. Run the server

```bash
node server.js
```

### 3. Start the game from the UI

For each side, select:

- `Player Type`: `Human`, `Local Engine`, or `AI Model (via MCP)`
- If `AI Model`: choose `Provider` (`Ollama` or `OpenRouter`) and model

The UI shows setup status inline:

- `Ollama reachable` / `Ollama not running`
- `OpenRouter API key detected` / `Missing OPENROUTER_API_KEY`

Click `Start Game` after selecting both sides.

## Notes

- The `server.js` file handles the communication with the UCI engines and serves the web interface.
- The `mcp_client.js` file contains the logic for the MCP client and its interaction with the LLM.
- Chess piece images are located in `public/img/chesspieces/wikipedia/`.
- You can modify `server.js` to change engine paths, game rules, or other settings.
