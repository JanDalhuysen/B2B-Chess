#pragma once
#include <stdio.h>
#include <stddef.h>

// uci_bot.h
#ifdef __cplusplus
extern "C" {
#endif

// Launches a UCI engine and returns a FILE* for writing commands
FILE* uci_engine_start(const char* engine_path, FILE** engine_out);
// Sends a position and gets the best move from the engine
int uci_engine_get_bestmove(FILE* engine_in, FILE* engine_out, const char* fen, char* bestmove, size_t bestmove_size);
// Clean up engine process
void uci_engine_stop(FILE* engine_in, FILE* engine_out);

#ifdef __cplusplus
}
#endif
