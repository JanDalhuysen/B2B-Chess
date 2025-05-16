#!/bin/sh

CFLAGS='-Wall -Wextra'
LIBS='-lraylib -lm'
SRC='src/*c'

cc -o jchess $SRC $CFLAGS $LIBS
