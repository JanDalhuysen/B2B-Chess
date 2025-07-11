import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Chess } from 'chess.js';
import { spawn } from 'child_process';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
let chess = new Chess();

let gameActive = false;
let whiteBotProcess = null;
let blackBotProcess = null;
let currentTurn = 'w';

const BOT_PATH = './bots/';

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('boardState', chess.fen());

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('startGame', ({ whiteBot, blackBot }) => {
    if (gameActive) {
      console.log('Game already active.');
      return;
    }
    chess = new Chess();
    io.emit('boardState', chess.fen());
    io.emit('gameStatus', 'Game started!');
    io.emit('gamePgn', '');

    whiteBotProcess = spawn(`${BOT_PATH}${whiteBot}`, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    blackBotProcess = spawn(`${BOT_PATH}${blackBot}`, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    whiteBotProcess.stdout.on('data', (data) => {
      console.log(`White Bot: ${data}`);
      handleBotOutput(data.toString(), 'w');
    });
    blackBotProcess.stdout.on('data', (data) => {
      console.log(`Black Bot: ${data}`);
      handleBotOutput(data.toString(), 'b');
    });

    whiteBotProcess.stderr.on('data', (data) => {
      console.error(`White Bot Error: ${data}`);
    });
    blackBotProcess.stderr.on('data', (data) => {
      console.error(`Black Bot Error: ${data}`);
    });

    gameActive = true;
    currentTurn = 'w';
    makeBotMove();
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
            currentTurn = currentTurn === 'w' ? 'b' : 'w';
            makeBotMove();
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

const mcpServer = new McpServer({
  name: 'b2b-chess',
  version: '1.0.0',
});

mcpServer.setRequestHandler(
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

mcpServer.setRequestHandler(
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

mcpServer.setRequestHandler(
  z.object({
    method: z.literal('make_move'),
    params: z.object({
      move: z.string().describe('The move to make in algebraic notation (e.g., e2e4, e7e8q).'),
    }),
  }),
  async ({ params }) => {
    try {
      const result = chess.move(params.move);
      if (result) {
        io.emit('boardState', chess.fen());
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

const transport = new StdioServerTransport();
mcpServer.connect(transport);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
