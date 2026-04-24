import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';
import 'dotenv/config';

// Environment variables are accessed directly from process.env to allow for runtime updates

const SERVER_URL = 'http://localhost:3000';
const chess = new Chess();

async function getLLMChoice({ prompt, provider, model }) {
  const { OLLAMA_URL = 'http://localhost:11434', OPENROUTER_API_KEY } = process.env;

  if (provider === 'ollama') {
    if (!model) {
      throw new Error('Missing Ollama model. Select a model in the UI or set OLLAMA_MODEL.');
    }

    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model,
      prompt,
      stream: false,
    });
    return response.data.response.trim();
  }

  if (provider === 'openrouter') {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Missing OPENROUTER_API_KEY for OpenRouter provider.');
    }
    if (!model) {
      throw new Error('Missing OpenRouter model. Select a model in the UI or set OPENROUTER_MODEL.');
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
      },
    );
    console.log(response.data);
    return response.data.choices[0].message.content.trim();
  }

  throw new Error(`Invalid provider: ${provider}`);
}

async function main() {
  const playerColor = process.argv[2];
  const providerArg = process.argv[3];
  const modelArg = process.argv[4];

  if (!playerColor || !['w', 'b'].includes(playerColor)) {
    console.error('Usage: node mcp_client.js <w|b> <ollama|openrouter> [model_name]');
    process.exit(1);
  }

  if (!providerArg || !['ollama', 'openrouter'].includes(providerArg)) {
    console.error('Provider is required and must be "ollama" or "openrouter".');
    process.exit(1);
  }

  const provider = providerArg;
  const model = modelArg || (provider === 'ollama' ? process.env.OLLAMA_MODEL : process.env.OPENROUTER_MODEL);

  console.log(`MCP client playing as ${playerColor === 'w' ? 'White' : 'Black'}`);
  console.log(`Provider: ${provider}, model: ${model || 'none'}`);
  console.log('Connecting to server...');

  const socket = io(SERVER_URL);

  socket.on('connect', () => {
    console.log('Connected to server.');
  });

  socket.on('boardState', (fen) => {
    chess.load(fen);
    console.log(`Board updated: ${fen}`);

    // Check if it's this player's turn
    if (chess.turn() === playerColor) {
      makeMove();
    }
  });

  socket.on('gameStatus', (status) => {
    console.log(`Game status: ${status}`);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server.');
  });

  async function makeMove() {
    const legalMoves = chess.moves();

    if (legalMoves.length === 0) {
      console.log('No legal moves available.');
      return;
    }

    const prompt = `
      You are a chess grandmaster. It is your turn to move.
      The current board state in FEN is: ${chess.fen()}
      The legal moves are: ${legalMoves.join(', ')}
      Your response must be a single move in algebraic notation from the list of legal moves.
      Only respond with the move, nothing else.
    `;

    let move;
    let validMove = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!validMove && attempts < maxAttempts) {
      move = await getLLMChoice({ prompt, provider, model });
      move = move.trim();
      console.log(`LLM suggested move: ${move}`);

      if (legalMoves.includes(move)) {
        validMove = true;
      } else {
        attempts++;
        console.log(`Invalid move received from LLM: ${move}. Retrying... (${attempts}/${maxAttempts})`);
      }
    }

    if (validMove) {
      console.log(`Making move: ${move}`);
      socket.emit('makeMove', move);
    } else {
      console.error('Failed to get valid move from LLM after max attempts. Making random move.');
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      console.log(`Making random move: ${randomMove}`);
      socket.emit('makeMove', randomMove);
    }
  }
}

main().catch(console.error);
