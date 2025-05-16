#pragma once
// lichess_bot.h
// Header for Lichess bot-vs-bot framework

#ifdef __cplusplus
extern "C" {
#endif

void lichess_bot_vs_bot();
void draw_board_from_moves(const char* moves);

#ifdef __cplusplus
}
#endif
