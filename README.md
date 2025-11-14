# Mylly (Nine Men's Morris)

A web-based implementation of the classic strategy board game Mylly, also known as Nine Men's Morris.

## How to Play

Simply open `index.html` in your web browser to start playing!

## Game Rules

### Objective
Reduce your opponent to 2 pieces or block all their moves.

### Game Phases

#### Phase 1 - Placement
- Players alternate placing their 9 pieces on empty positions
- Form a "mill" (3 pieces in a row) to remove an opponent's piece
- Pieces in a mill cannot be removed unless no other option exists

#### Phase 2 - Movement
- After all pieces are placed, move one piece to an adjacent empty position per turn
- Form a mill to remove an opponent's piece
- You can repeatedly open and close the same mill to remove multiple pieces

#### Phase 3 - Flying
- When reduced to 3 pieces, you can move to ANY empty position (not just adjacent)

### Forming a Mill
A mill is formed when you align 3 of your pieces in a row along any line on the board. When you form a mill, you can remove one of your opponent's pieces (except pieces in a mill, unless all opponent pieces are in mills).

### Winning
You win by either:
- Reducing your opponent to 2 pieces (during movement phase)
- Blocking all of your opponent's legal moves

## Features

- Clean, modern UI with visual feedback
- Automatic mill detection
- Valid move highlighting
- Flying mode when reduced to 3 pieces
- Game over detection
- Rules modal for reference
- Responsive design

## Technical Details

- Pure HTML, CSS, and JavaScript
- No dependencies required
- Works in all modern browsers

## Files

- `index.html` - Main game structure
- `style.css` - Styling and animations
- `script.js` - Game logic and interactivity

Enjoy playing Mylly!
