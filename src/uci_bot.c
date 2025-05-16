// uci_bot.c
// Minimal UCI engine communication for local bot-vs-bot play
#include "uci_bot.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Start a UCI engine, return FILE* for writing, set engine_out to FILE* for reading
FILE* uci_engine_start(const char* engine_path, FILE** engine_out) {
    int in_pipe[2], out_pipe[2];
    pipe(in_pipe);  // parent writes to in_pipe[1], child reads from in_pipe[0]
    pipe(out_pipe); // child writes to out_pipe[1], parent reads from out_pipe[0]
    pid_t pid = fork();
    if (pid == 0) {
        dup2(in_pipe[0], 0);  // stdin
        dup2(out_pipe[1], 1); // stdout
        close(in_pipe[1]); close(out_pipe[0]);
        execl(engine_path, engine_path, NULL);
        exit(1);
    }
    close(in_pipe[0]); close(out_pipe[1]);
    *engine_out = fdopen(out_pipe[0], "r");
    return fdopen(in_pipe[1], "w");
}

// Send position and get bestmove from engine
int uci_engine_get_bestmove(FILE* engine_in, FILE* engine_out, const char* fen, char* bestmove, size_t bestmove_size) {
    char cmd[1024];
    if (fen)
        snprintf(cmd, sizeof(cmd), "position fen %s\ngo\n", fen);
    else
        snprintf(cmd, sizeof(cmd), "position startpos\ngo\n");
    fputs(cmd, engine_in); fflush(engine_in);
    char line[256];
    while (fgets(line, sizeof(line), engine_out)) {
        if (strncmp(line, "bestmove ", 9) == 0) {
            strncpy(bestmove, line + 9, bestmove_size - 1);
            bestmove[bestmove_size-1] = 0;
            char* space = strchr(bestmove, ' ');
            if (space) *space = 0;
            return 0;
        }
    }
    return 1;
}

void uci_engine_stop(FILE* engine_in, FILE* engine_out) {
    if (engine_in) { fputs("quit\n", engine_in); fflush(engine_in); fclose(engine_in); }
    if (engine_out) fclose(engine_out);
}
