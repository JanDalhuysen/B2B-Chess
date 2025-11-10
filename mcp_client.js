
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import axios from 'axios';
import 'dotenv/config';

const {
  LLM_PROVIDER,
  OLLAMA_URL,
  OLLAMA_MODEL,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
} = process.env;

const SERVER_URL = 'http://localhost:3000';
const chess = new Chess();

async function getLLMChoice(prompt) {
  if (LLM_PROVIDER === 'ollama') {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    });
    return response.data.response.trim();
  } else if (LLM_PROVIDER === 'openrouter') {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
      }
    );
    console.log(response.data);
    return response.data.choices[0].message.content.trim();
  } else {
    throw new Error('Invalid LLM_PROVIDER specified in .env file');
  }
}

async function main() {
  const playerColor = process.argv[2];
  if (!playerColor || !['w', 'b'].includes(playerColor)) {
    console.error('Usage: node mcp_client.js <w|b>');
    process.exit(1);
  }

  console.log(`MCP client playing as ${playerColor === 'w' ? 'White' : 'Black'}`);
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
      move = await getLLMChoice(prompt);
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
