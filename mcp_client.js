
import { spawn } from 'child_process';
import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import axios from 'axios';
import 'dotenv/config';

const {
  LLM_PROVIDER,
  OLLAMA_URL,
  OLLAMA_MODEL,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
} = process.env;

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
    return response.data.choices[0].message.content.trim();
  } else {
    throw new Error('Invalid LLM_PROVIDER specified in .env file');
  }
}

async function main() {
  const serverProcess = spawn('node', ['server.js']);

  // Ensure the server process is killed when the client exits
  process.on('exit', () => {
    serverProcess.kill();
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });

  const transport = new StdioClientTransport(serverProcess);
  const client = new McpClient({ transport });

  await client.connect();
  console.log('MCP client connected to server.');

  const playerColor = process.argv[2];
  if (!playerColor || !['w', 'b'].includes(playerColor)) {
    console.error('Usage: node mcp_client.js <w|b>');
    process.exit(1);
  }

  console.log(`MCP client playing as ${playerColor === 'w' ? 'White' : 'Black'}`);

  while (true) {
    const gameState = await client.callTool('get_game_state', {});
    const gameStateText = JSON.parse(gameState.content[0].text);

    if (gameStateText.turn === playerColor) {
      const legalMoves = await client.callTool('get_legal_moves', {});
      const legalMovesText = JSON.parse(legalMoves.content[0].text);

      const prompt = `
        You are a chess grandmaster. It is your turn to move.
        The current board state in FEN is: ${gameStateText.fen}
        The legal moves are: ${legalMovesText.join(', ')}
        Your response must be a single move in algebraic notation from the list of legal moves.
      `;

      let move;
      let validMove = false;
      while (!validMove) {
        move = await getLLMChoice(prompt);
        if (legalMovesText.includes(move)) {
          validMove = true;
        } else {
          console.log(`Invalid move received from LLM: ${move}. Retrying...`);
        }
      }

      await client.callTool('make_move', { move });
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second before checking again
  }
}

main().catch(console.error);
