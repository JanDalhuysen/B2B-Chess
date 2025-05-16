#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <raylib.h>
#include "lichess_bot.h"

#define WIN_WIDTH 800
#define WIN_HEIGHT 800

#define ROWS 8
#define COLS ROWS

#define COLOR_LIGHT RAYWHITE
#define COLOR_DARK DARKGRAY

#define PLAYER_WHITE 0
#define PLAYER_BLACK 1

// Piece Colors
#define PIECE_WHITE 0
#define PIECE_BLACK 1

// Piece Types
#define PIECE_PAWN 0
#define PIECE_KNIGHT 1
#define PIECE_BISHOP 2
#define PIECE_ROOK 3
#define PIECE_QUEEN 4
#define PIECE_KING 5

// NOTE: I know this can be stored in a singe byte (even a single nibble) easily
typedef struct {
    uint8_t type;
    uint8_t color;
} Piece;

// Global for now
Piece board[ROWS*COLS];
uint8_t player_turn = PLAYER_WHITE; // white
Texture piece_textures[6];

void draw_board()
{
    int size = WIN_HEIGHT / ROWS;
    for (int r = 0; r < ROWS; r++) {
        for (int c = 0; c < COLS; c++) {
            Color color = (r + c) % 2 == 0 ? COLOR_LIGHT : COLOR_DARK;
            DrawRectangle(r * size, c * size, size, size, color);

            switch (board[r*COLS + c].type) {
                case PIECE_PAWN:
                    DrawText("p", r*size + size*0.5f, c*size + size*0.5f, 30, RED);
                break;
                case PIECE_KING:
                    DrawText("K", r*size, c*size, 30, RED);
                break;

            }
        }
    }
}

int main()
{
    printf("Hello, World!\n");

    lichess_bot_vs_bot();

    // Keep the window open after the match until the user closes it
    if (!IsWindowReady()) InitWindow(WIN_WIDTH, WIN_HEIGHT, "Bot vs Bot Chess");
    while (!WindowShouldClose()) {
        BeginDrawing();
        ClearBackground(BLACK);
        draw_board_from_moves(""); // Optionally, pass the final moves string if you want to show the last board
        DrawText("Game finished! Press [X] to close.", 20, WIN_HEIGHT - 40, 24, RED);
        EndDrawing();
    }
    CloseWindow();
    return 0;
}
