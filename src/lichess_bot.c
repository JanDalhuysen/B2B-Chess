// lichess_bot.c
// Basic Lichess bot-vs-bot framework (skeleton)
// Requires: libcurl, cJSON (or similar JSON parser)
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "uci_bot.h"
#include <raylib.h>
#include <ctype.h>

// Replace with your actual Lichess bot tokens
#define BOT1_TOKEN "YOUR_BOT1_TOKEN"
#define BOT2_TOKEN "YOUR_BOT2_TOKEN"

#define WIN_WIDTH 800
#define WIN_HEIGHT 800
#define ROWS 8
#define COLS 8
#define COLOR_LIGHT RAYWHITE
#define COLOR_DARK DARKGRAY

// Piece texture globals
static Texture2D piece_textures[12]; // 0-5: white, 6-11: black

// Helper: load piece textures
static void load_piece_textures() {
    const char* names[12] = {
        "white-pawn.png", "white-knight.png", "white-bishop.png", "white-rook.png", "white-queen.png", "white-king.png",
        "black-pawn.png", "black-knight.png", "black-bishop.png", "black-rook.png", "black-queen.png", "black-king.png"
    };
    for (int i = 0; i < 12; ++i) {
        char path[128];
        snprintf(path, sizeof(path), "../assets/%s", names[i]);
        piece_textures[i] = LoadTexture(path);
    }
}

// Helper: unload piece textures
static void unload_piece_textures() {
    for (int i = 0; i < 12; ++i) UnloadTexture(piece_textures[i]);
}

// Function to send a move to Lichess (skeleton)
int lichess_send_move(const char* game_id, const char* move, const char* token) {
    // Use libcurl to POST move to Lichess API
    // Endpoint: https://lichess.org/api/bot/game/{gameId}/move/{move}
    // Use token for Authorization
    // Return 0 on success, nonzero on error
    return 0;
}

// Function to get the current game state (skeleton)
int lichess_get_game_state(const char* game_id, const char* token, char* out_state, size_t out_size) {
    // Use libcurl to GET game state from Lichess API
    // Endpoint: https://lichess.org/api/bot/game/stream/{gameId}
    // Parse response and fill out_state
    return 0;
}

// Helper: convert square like "e2" to (row, col)
static void algebraic_to_coords(const char* sq, int* row, int* col) {
    *col = sq[0] - 'a';
    *row = 8 - (sq[1] - '0');
}

// Helper: set up the board in the initial position
static void setup_startpos(int board[8][8]) {
    // 0=empty, 1=P, 2=N, 3=B, 4=R, 5=Q, 6=K, -1=p, -2=n, ...
    int white[8] = {4,2,3,5,6,3,2,4};
    int black[8] = { -4,-2,-3,-5,-6,-3,-2,-4 };
    for (int i = 0; i < 8; ++i) {
        board[0][i] = black[i];
        board[1][i] = -1; // black pawn
        board[6][i] = 1;  // white pawn
        board[7][i] = white[i];
    }
    for (int r = 2; r < 6; ++r) for (int c = 0; c < 8; ++c) board[r][c] = 0;
}

// Helper: apply a move in UCI format (e.g. "e2e4", "e7e8q")
static void apply_uci_move(int board[8][8], const char* move) {
    int from_row, from_col, to_row, to_col;
    algebraic_to_coords(move, &from_row, &from_col);
    algebraic_to_coords(move+2, &to_row, &to_col);
    int piece = board[from_row][from_col];
    board[from_row][from_col] = 0;
    // Promotion
    if (move[4]) {
        int promo = move[4];
        int val = (piece > 0) ? 1 : -1;
        switch (tolower(promo)) {
            case 'q': board[to_row][to_col] = 5*val; break;
            case 'r': board[to_row][to_col] = 4*val; break;
            case 'b': board[to_row][to_col] = 3*val; break;
            case 'n': board[to_row][to_col] = 2*val; break;
            default: board[to_row][to_col] = piece; break;
        }
    } else {
        board[to_row][to_col] = piece;
    }
}

// Helper: draw a piece using textures
static void draw_piece(int piece, int r, int c, int size) {
    if (piece == 0) return;
    int idx = -1;
    if (piece > 0) idx = piece - 1; // white: 1-6 -> 0-5
    else if (piece < 0) idx = 6 + (-piece - 1); // black: -1 to -6 -> 6-11
    if (idx >= 0 && idx < 12) {
        DrawTextureEx(piece_textures[idx], (Vector2){c*size, r*size}, 0, (float)size/piece_textures[idx].width, WHITE);
    }
}

// Function to draw the board from the move list
void draw_board_from_moves(const char* moves) {
    int board[8][8];
    setup_startpos(board);
    // Parse moves string (space-separated UCI moves)
    char moves_copy[1024];
    strncpy(moves_copy, moves, sizeof(moves_copy)-1);
    moves_copy[sizeof(moves_copy)-1] = 0;
    char* saveptr;
    char* move = strtok_r(moves_copy, " ", &saveptr);
    while (move) {
        if (strlen(move) >= 4)
            apply_uci_move(board, move);
        move = strtok_r(NULL, " ", &saveptr);
    }
    int size = WIN_HEIGHT / ROWS;
    for (int r = 0; r < ROWS; r++) {
        for (int c = 0; c < COLS; c++) {
            Color color = (r + c) % 2 == 0 ? COLOR_LIGHT : COLOR_DARK;
            DrawRectangle(r * size, c * size, size, size, color);
            draw_piece(board[r][c], r, c, size);
        }
    }
}

// Function to start a bot-vs-bot game (skeleton)
void lichess_bot_vs_bot() {
    // Example: play Stockfish vs Stockfish locally
    const char* engine1 = "../bots/stockfish-ubuntu-x86-64-avx2";
    const char* engine2 = "../bots/fairy-stockfish_x86-64";
    FILE *e1_in, *e1_out, *e2_in, *e2_out;
    e1_in = uci_engine_start(engine1, &e1_out);
    e2_in = uci_engine_start(engine2, &e2_out);

    // UCI initialization for both engines
    fputs("uci\n", e1_in); fflush(e1_in);
    fputs("uci\n", e2_in); fflush(e2_in);
    char line[256];
    // Wait for 'uciok' from both engines, print all output
    int uciok_limit = 1000;
    int count = 0;
    while (fgets(line, sizeof(line), e1_out) && count++ < uciok_limit) {
        printf("[engine1] %s", line);
        if (strstr(line, "uciok")) break;
    }
    count = 0;
    while (fgets(line, sizeof(line), e2_out) && count++ < uciok_limit) {
        printf("[engine2] %s", line);
        if (strstr(line, "uciok")) break;
    }
    // Ready both engines
    fputs("isready\n", e1_in); fflush(e1_in);
    fputs("isready\n", e2_in); fflush(e2_in);
    int readyok_limit = 1000;
    count = 0;
    while (fgets(line, sizeof(line), e1_out) && count++ < readyok_limit) {
        printf("[engine1] %s", line);
        if (strstr(line, "readyok")) break;
    }
    count = 0;
    while (fgets(line, sizeof(line), e2_out) && count++ < readyok_limit) {
        printf("[engine2] %s", line);
        if (strstr(line, "readyok")) break;
    }

    char fen[256] = "startpos";
    char moves[1024] = "";
    char bestmove[16];
    int turn = 0; // 0 = engine1, 1 = engine2
    printf("[local bot-vs-bot] Playing...\n");

    InitWindow(WIN_WIDTH, WIN_HEIGHT, "Bot vs Bot Chess");
    load_piece_textures();
    SetTargetFPS(10);
    int running = 1;

    for (int ply = 0; ply < 200 && running; ++ply) {
        char fen_cmd[2048];
        if (strlen(moves) > 0)
            snprintf(fen_cmd, sizeof(fen_cmd), "position startpos moves %s", moves);
        else
            snprintf(fen_cmd, sizeof(fen_cmd), "position startpos");
        FILE* in = turn ? e2_in : e1_in;
        FILE* out = turn ? e2_out : e1_out;
        // Wait for readyok before move
        fputs("isready\n", in); fflush(in);
        count = 0;
        while (fgets(line, sizeof(line), out) && count++ < readyok_limit) {
            printf("[%s] %s", turn ? "engine2" : "engine1", line);
            if (strstr(line, "readyok")) break;
        }
        // Send move and get bestmove, limit to 1 second per move
        fprintf(in, "%s\ngo movetime 1000\n", fen_cmd); fflush(in);
        int bestmove_limit = 10000;
        count = 0;
        while (fgets(line, sizeof(line), out) && count++ < bestmove_limit) {
            printf("[%s] %s", turn ? "engine2" : "engine1", line);
            if (strncmp(line, "bestmove ", 9) == 0) {
                strncpy(bestmove, line + 9, sizeof(bestmove) - 1);
                bestmove[sizeof(bestmove)-1] = 0;
                char* space = strchr(bestmove, ' ');
                if (space) *space = 0;
                break;
            }
        }
        if (strcmp(bestmove, "(none)") == 0 || strlen(bestmove) < 2) break;
        // Print move with bot label
        if (turn == 0)
            printf("White: %s\n", bestmove);
        else
            printf("Black: %s\n", bestmove);
        if (strlen(moves) > 0) strcat(moves, " ");
        strcat(moves, bestmove);
        turn = 1 - turn;

        // Draw board after each move and process window events
        if (IsWindowReady()) {
            BeginDrawing();
            ClearBackground(BLACK);
            draw_board_from_moves(moves);
            EndDrawing();
            if (WindowShouldClose()) running = 0;
            // Wait 1 second between moves
            double t0 = GetTime();
            while (GetTime() - t0 < 1.0 && !WindowShouldClose()) {
                // Allow window to process events
                WaitTime(0.01f);
            }
        }
    }

    printf("\n[local bot-vs-bot] Game finished.\n");
    unload_piece_textures();
    CloseWindow();
    uci_engine_stop(e1_in, e1_out);
    uci_engine_stop(e2_in, e2_out);
}
