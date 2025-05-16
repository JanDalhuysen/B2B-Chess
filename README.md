# JChess: Local Bot-vs-Bot Chess with Raylib

This project lets you watch two chess engines (UCI bots) play against each other locally, with a graphical board using Raylib and custom piece images.

## Features
- Local engine-vs-engine chess (Stockfish, Fairy-Stockfish, etc.)
- Graphical board with custom piece images (PNG)
- 1 second per move for each bot
- Move list printed to terminal

## Prerequisites
- CMake >= 3.10
- C/C++ compiler (GCC, Clang, etc.)
- [vcpkg](https://github.com/microsoft/vcpkg) for dependency management
- Two UCI-compatible chess engines (e.g. Stockfish, Fairy-Stockfish)
- Raylib and curl installed via vcpkg

## Setup

### 1. Install vcpkg (if not already installed)
```
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg
./bootstrap-vcpkg.sh
```

### 2. Install dependencies with vcpkg
```
./vcpkg install raylib curl
```

### 3. Download chess engines
- Download Stockfish: https://stockfishchess.org/download/
- Download Fairy-Stockfish: https://github.com/ianfab/Fairy-Stockfish/releases
- Place the engine executables in the `bots/` folder (e.g. `bots/stockfish-ubuntu-x86-64-avx2`)

### 4. Add chess piece images
- Place PNG images for each piece in the `assets/` folder:
  - white-pawn.png, white-knight.png, white-bishop.png, white-rook.png, white-queen.png, white-king.png
  - black-pawn.png, black-knight.png, black-bishop.png, black-rook.png, black-queen.png, black-king.png

### 5. Build the project
```
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=../vcpkg/scripts/buildsystems/vcpkg.cmake
cmake --build build
```

### 6. Run the program
```
./build/main
```

You will see a graphical chessboard and the bots will play against each other, with moves printed in the terminal.

## Notes
- You can change the engine paths in `src/lichess_bot.c` to use different UCI engines.
- The board setup and piece images must match standard chess orientation and naming.
- If you encounter missing pieces, check the `assets/` folder and file names.
