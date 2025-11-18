import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
// import { Server as jan_server } from '@modelcontextprotocol/sdk/server/index.js';
// import { jan_server, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
let chess = new Chess();

let gameActive = false;
let whiteBotProcess = null;
let blackBotProcess = null;
let currentTurn = 'w';
let whiteIsBot = true;
let blackIsBot = true;
let whiteIsMcp = false;
let blackIsMcp = false;
let whiteMcpProcess = null;
let blackMcpProcess = null;

const BOT_PATH = './bots/';

app.use(express.static('public'));

app.get('/api/bots', (req, res) => {
  fs.readdir(BOT_PATH, (err, files) => {
    if (err) {
      console.error('Failed to read bots directory:', err);
      return res.status(500).json({ error: 'Failed to retrieve bots' });
    }

    const bots = files.map(file => {
      const extension = path.extname(file);
      const os = extension === '.exe' ? 'Windows' : 'Linux';
      const name = file.replace(extension, '');
      return {
        value: file,
        name: `${name} (${os})`,
      };
    });

    res.json(bots);
  });
});

app.get('/api/llms', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    const models = response.data.models.map(model => model.name);
    res.json(models);
  } catch (error) {
    console.error('Failed to fetch LLMs from Ollama:', error.message);
    res.status(500).json({ error: 'Failed to fetch LLMs' });
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('boardState', chess.fen());

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('startGame', ({ whiteBot, blackBot, whiteModel, blackModel }) => {
    if (gameActive) {
      console.log('Game already active.');
      return;
    }
    chess = new Chess();
    io.emit('boardState', chess.fen());
    io.emit('gameStatus', 'Game started!');
    io.emit('gamePgn', '');

    // Determine if players are human or bot
    whiteIsBot = whiteBot !== 'human';
    blackIsBot = blackBot !== 'human';
    whiteIsMcp = whiteBot === 'mcp';
    blackIsMcp = blackBot === 'mcp';

    if (whiteIsBot && whiteBot !== 'mcp') {
      whiteBotProcess = spawn(`${BOT_PATH}${whiteBot}`, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      whiteBotProcess.stdout.on('data', (data) => {
        console.log(`White Bot: ${data}`);
        handleBotOutput(data.toString(), 'w');
      });
      whiteBotProcess.stderr.on('data', (data) => {
        console.error(`White Bot Error: ${data}`);
      });
    }

    if (blackIsBot && blackBot !== 'mcp') {
      blackBotProcess = spawn(`${BOT_PATH}${blackBot}`, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      blackBotProcess.stdout.on('data', (data) => {
        console.log(`Black Bot: ${data}`);
        handleBotOutput(data.toString(), 'b');
      });
      blackBotProcess.stderr.on('data', (data) => {
        console.error(`Black Bot Error: ${data}`);
      });
    }

    if (whiteIsMcp) {
      console.log(`Starting White MCP with model: ${whiteModel || 'default'}`);
      const args = ['mcp_client.js', 'w'];
      if (whiteModel) args.push(whiteModel);

      whiteMcpProcess = spawn('node', args, { stdio: ['inherit', 'inherit', 'inherit'] });
      whiteMcpProcess.on('error', (err) => console.error('White MCP Error:', err));
    }

    if (blackIsMcp) {
      console.log(`Starting Black MCP with model: ${blackModel || 'default'}`);
      const args = ['mcp_client.js', 'b'];
      if (blackModel) args.push(blackModel);

      blackMcpProcess = spawn('node', args, { stdio: ['inherit', 'inherit', 'inherit'] });
      blackMcpProcess.on('error', (err) => console.error('Black MCP Error:', err));
    }

    gameActive = true;
    currentTurn = 'w';

    if (whiteIsBot && whiteBot !== 'mcp') {
      makeBotMove();
    } else if (whiteBot === 'mcp') {
      io.emit('gameStatus', 'Waiting for MCP move from White');
    } else {
      io.emit('gameStatus', 'White human to move');
    }
  });

  socket.on('makeMove', (move) => {
    if (!gameActive) return;
    console.log(`Received move: ${JSON.stringify(move)}`);

    const result = chess.move(move);
    if (result) {
      io.emit('boardState', chess.fen());
      io.emit('gamePgn', chess.pgn());

      if (chess.turn() === 'w' && whiteIsBot) {
        currentTurn = 'w';
        if (whiteIsMcp) {
          io.emit('gameStatus', 'Waiting for MCP move from White');
        } else {
          makeBotMove();
        }
      } else if (chess.turn() === 'b' && blackIsBot) {
        currentTurn = 'b';
        if (blackIsMcp) {
          io.emit('gameStatus', 'Waiting for MCP move from Black');
        } else {
          makeBotMove();
        }
      } else {
        io.emit('gameStatus', `${chess.turn() === 'w' ? 'White' : 'Black'} human to move`);
      }
    } else {
      socket.emit('gameStatus', 'Invalid move');
    }
  });

  socket.on('resetGame', () => {
    if (whiteBotProcess) {
      whiteBotProcess.kill();
      whiteBotProcess = null;
    }
    if (blackBotProcess) {
      blackBotProcess.kill();
      blackBotProcess = null;
    }
    chess = new Chess();
    io.emit('boardState', chess.fen());
    io.emit('gameStatus', 'Game reset.');
    io.emit('gamePgn', '');
    gameActive = false;
    currentTurn = 'w';

    if (whiteMcpProcess) {
      whiteMcpProcess.kill();
      whiteMcpProcess = null;
    }
    if (blackMcpProcess) {
      blackMcpProcess.kill();
      blackMcpProcess = null;
    }
  });
});

async function makeBotMove() {
  if (!gameActive) return;

  const currentBot = currentTurn === 'w' ? whiteBotProcess : blackBotProcess;
  const opponentBot = currentTurn === 'w' ? blackBotProcess : whiteBotProcess;

  if (!currentBot) {
    console.error(`No bot process for ${currentTurn} turn.`);
    return;
  }

  io.emit('gameStatus', `${currentTurn === 'w' ? 'White' : 'Black'} bot thinking...`);

  currentBot.stdin.write(`position fen ${chess.fen()}\n`);
  // currentBot.stdin.write(`go infinite\n`);
  currentBot.stdin.write(`go movetime 1000\n`);
}

function handleBotOutput(output, color) {
  if (!gameActive) return;

  const lines = output.split('\n');
  const bestmoveLine = lines.find(line => line.startsWith('bestmove'));

  if (bestmoveLine) {
    const move = bestmoveLine.split(' ')[1];
    if (move) {
      try {
        console.log(`Bot ${color} move: ${move}`);
        const result = chess.move(move);
        if (result) {
          io.emit('boardState', chess.fen());
          io.emit('gamePgn', chess.pgn());

          // if (chess.game_over()) {
          //   gameActive = false;
          //   let status = 'Game Over: ';
          //   if (chess.in_checkmate()) {
          //     status += `${currentTurn === 'w' ? 'Black' : 'White'} wins by checkmate!`;
          //   } else if (chess.in_draw()) {
          //     status += 'Draw!';
          //   } else {
          //     status += 'Stalemate!';
          //   }
          //   io.emit('gameStatus', status);
          //   if (whiteBotProcess) whiteBotProcess.kill();
          //   if (blackBotProcess) blackBotProcess.kill();
          // } else {
          // Only switch to bot move if the current player is a bot
          if (chess.turn() === 'w' && whiteIsBot) {
            currentTurn = 'w';
            if (whiteIsMcp) {
              io.emit('gameStatus', 'Waiting for MCP move from White');
            } else if (whiteBotProcess) {
              makeBotMove();
            }
          } else if (chess.turn() === 'b' && blackIsBot) {
            currentTurn = 'b';
            if (blackIsMcp) {
              io.emit('gameStatus', 'Waiting for MCP move from Black');
            } else if (blackBotProcess) {
              makeBotMove();
            }
          } else {
            io.emit('gameStatus', `${chess.turn() === 'w' ? 'White' : 'Black'} human to move`);
          }
          // }
        } else {
          console.error(`Invalid move received from ${color} bot: ${move}`);
        }
      } catch (error) {
        console.error(`Error making move from ${color} bot (${move}): ${error.message}`);
      }
    }
  }
}

const jan_server = new McpServer({
  name: 'b2b-chess',
  version: '1.0.0',
});

jan_server.tool("get_game_state",
  z.object({
    method: z.literal('get_game_state'),
    params: z.object({}),
  }),
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            fen: chess.fen(),
            turn: chess.turn(),
            history: chess.history(),
          }),
        },
      ],
    };
  }
);

jan_server.tool("get_legal_moves",
  z.object({
    method: z.literal('get_legal_moves'),
    params: z.object({}),
  }),
  async () => {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(chess.moves()),
        },
      ],
    };
  }
);

jan_server.tool(
  "make_move",
  { move: z.string().describe('The move to make in algebraic notation (e.g., e2e4, e7e8q).') },
  async ({ move }) => {
    try {
      // If move is an object, try to extract the move string
      let moveStr = move;
      if (typeof move === 'object' && move !== null) {
        // Try common property names
        moveStr = move.move || move.value || move.toString();
      }
      console.log(`MCP making move: ${moveStr}`);

      const result = chess.move(moveStr);
      if (result) {
        io.emit('boardState', chess.fen());
        io.emit('gamePgn', chess.pgn());

        if (chess.turn() === 'w' && whiteIsBot) {
          currentTurn = 'w';
          if (whiteIsMcp) {
            io.emit('gameStatus', 'Waiting for MCP move from White');
          } else if (whiteBotProcess) {
            makeBotMove();
          }
        } else if (chess.turn() === 'b' && blackIsBot) {
          currentTurn = 'b';
          if (blackIsMcp) {
            io.emit('gameStatus', 'Waiting for MCP move from Black');
          } else if (blackBotProcess) {
            makeBotMove();
          }
        } else {
          io.emit('gameStatus', `${chess.turn() === 'w' ? 'White' : 'Black'} human to move`);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Move successful. New FEN: ${chess.fen()}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'Invalid move.',
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error making move: ${error.message}`,
          },
        ],
      };
    }
  }
);

// jan_server.tool("make_move",
//   z.object({
//     method: z.literal('make_move'),
//     params: z.object({
//       move: z.string().describe('The move to make in algebraic notation (e.g., e2e4, e7e8q).'),
//     }),
//   }),
//   async ({ params }) => {
//     try {
//       const result = chess.move(params.move);
//       if (result) {
//         // io.emit('boardState', chess.fen());
//         io.emit('gamePgn', chess.pgn());

//         if (chess.turn() === 'w' && whiteIsBot && whiteBotProcess) {
//           currentTurn = 'w';
//           makeBotMove();
//         } else if (chess.turn() === 'b' && blackIsBot && blackBotProcess) {
//           currentTurn = 'b';
//           makeBotMove();
//         } else if (chess.turn() === 'w' && whiteIsBot && whiteBot === 'mcp') {
//           io.emit('gameStatus', 'Waiting for MCP move from White');
//         } else if (chess.turn() === 'b' && blackIsBot && blackBot === 'mcp') {
//           io.emit('gameStatus', 'Waiting for MCP move from Black');
//         } else {
//           io.emit('gameStatus', `${chess.turn() === 'w' ? 'White' : 'Black'} human to move`);
//         }

//         return {
//           content: [
//             {
//               type: 'text',
//               text: `Move successful. New FEN: ${chess.fen()}`,
//             },
//           ],
//         };
//       } else {
//         return {
//           content: [
//             {
//               type: 'text',
//               text: 'Invalid move.',
//             },
//           ],
//         };
//       }
//     } catch (error) {
//       return {
//         content: [
//           {
//             type: 'text',
//             text: `Error making move: ${error.message}`,
//           },
//         ],
//       };
//     }
//   }
// );

const transport = new StdioServerTransport();
jan_server.connect(transport);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
