// Game state
const gameState = {
    currentPlayer: 'white',
    phase: 'placement', // placement, movement, removal
    board: Array(24).fill(null),
    whitePieces: 9,
    blackPieces: 9,
    whitePlaced: 0,
    blackPlaced: 0,
    selectedPosition: null,
    millFormed: false,
    pieceCount: { white: 0, black: 0 }
};

// Define adjacencies for each position
const adjacencies = {
    0: [1, 7],
    1: [0, 2, 9],
    2: [1, 3],
    3: [2, 4, 11],
    4: [3, 5],
    5: [4, 6, 13],
    6: [5, 7],
    7: [6, 0, 15],
    8: [9, 15],
    9: [8, 10, 1, 17],
    10: [9, 11],
    11: [10, 12, 3, 19],
    12: [11, 13],
    13: [12, 14, 5, 21],
    14: [13, 15],
    15: [14, 8, 7, 23],
    16: [17, 23],
    17: [16, 18, 9],
    18: [17, 19],
    19: [18, 20, 11],
    20: [19, 21],
    21: [20, 22, 13],
    22: [21, 23],
    23: [22, 16, 15]
};

// Define all possible mills (lines of three)
const mills = [
    // Outer square
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    // Middle square
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    // Inner square
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    // Connecting lines
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]
];

// Initialize game
function initGame() {
    const positions = document.querySelectorAll('.position');
    positions.forEach(pos => {
        pos.addEventListener('click', handlePositionClick);
    });

    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('rules-btn').addEventListener('click', showRules);
    document.getElementById('new-game-btn').addEventListener('click', resetGame);

    // Modal close handlers
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideRules);
    }

    window.addEventListener('click', (e) => {
        const rulesModal = document.getElementById('rules-modal');
        if (e.target === rulesModal) {
            hideRules();
        }
    });

    updateDisplay();
}

function handlePositionClick(e) {
    const posIndex = parseInt(e.target.getAttribute('data-pos'));

    if (gameState.phase === 'placement') {
        handlePlacement(posIndex);
    } else if (gameState.phase === 'removal') {
        handleRemoval(posIndex);
    } else if (gameState.phase === 'movement') {
        handleMovement(posIndex);
    }
}

function handlePlacement(posIndex) {
    // Check if position is empty
    if (gameState.board[posIndex] !== null) {
        return;
    }

    // Place piece
    gameState.board[posIndex] = gameState.currentPlayer;

    if (gameState.currentPlayer === 'white') {
        gameState.whitePlaced++;
        gameState.pieceCount.white++;
    } else {
        gameState.blackPlaced++;
        gameState.pieceCount.black++;
    }

    updateDisplay();

    // Check for mill
    if (isInMill(posIndex, gameState.currentPlayer)) {
        gameState.millFormed = true;
        gameState.phase = 'removal';
        updateDisplay();
    } else {
        switchPlayer();

        // Check if all pieces are placed
        if (gameState.whitePlaced === 9 && gameState.blackPlaced === 9) {
            gameState.phase = 'movement';
            updateDisplay();
        }
    }
}

function handleMovement(posIndex) {
    const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';

    // If no piece selected, select a piece
    if (gameState.selectedPosition === null) {
        if (gameState.board[posIndex] === gameState.currentPlayer) {
            gameState.selectedPosition = posIndex;
            updateDisplay();
        }
    } else {
        // If clicking the same position, deselect
        if (posIndex === gameState.selectedPosition) {
            gameState.selectedPosition = null;
            updateDisplay();
            return;
        }

        // Check if this is a valid move
        const canFly = gameState.pieceCount[gameState.currentPlayer] === 3;
        const isAdjacent = adjacencies[gameState.selectedPosition].includes(posIndex);
        const isEmpty = gameState.board[posIndex] === null;

        if (isEmpty && (canFly || isAdjacent)) {
            // Move piece
            gameState.board[posIndex] = gameState.currentPlayer;
            gameState.board[gameState.selectedPosition] = null;
            const movedFrom = gameState.selectedPosition;
            gameState.selectedPosition = null;

            updateDisplay();

            // Check for mill
            if (isInMill(posIndex, gameState.currentPlayer)) {
                gameState.millFormed = true;
                gameState.phase = 'removal';
                updateDisplay();
            } else {
                switchPlayer();
                checkGameOver();
            }
        } else {
            // Invalid move - try to select different piece
            if (gameState.board[posIndex] === gameState.currentPlayer) {
                gameState.selectedPosition = posIndex;
                updateDisplay();
            }
        }
    }
}

function handleRemoval(posIndex) {
    const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';

    // Check if this is an opponent's piece
    if (gameState.board[posIndex] !== opponent) {
        return;
    }

    // Check if piece is in a mill (can only remove if no other pieces available)
    if (isInMill(posIndex, opponent)) {
        // Check if all opponent pieces are in mills
        const opponentPositions = gameState.board
            .map((piece, idx) => piece === opponent ? idx : -1)
            .filter(idx => idx !== -1);

        const hasNonMillPiece = opponentPositions.some(pos => !isInMill(pos, opponent));

        if (hasNonMillPiece) {
            return; // Can't remove from mill if other pieces available
        }
    }

    // Remove piece
    gameState.board[posIndex] = null;
    gameState.pieceCount[opponent]--;

    gameState.millFormed = false;
    gameState.phase = gameState.whitePlaced === 9 && gameState.blackPlaced === 9 ? 'movement' : 'placement';

    updateDisplay();

    // Check win condition
    if (checkGameOver()) {
        return;
    }

    switchPlayer();
}

function isInMill(position, player) {
    return mills.some(mill =>
        mill.includes(position) &&
        mill.every(pos => gameState.board[pos] === player)
    );
}

function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';
    updateDisplay();
}

function checkGameOver() {
    const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';

    // Check if opponent has only 2 pieces
    if (gameState.pieceCount[opponent] < 3 && gameState.phase === 'movement') {
        showGameOver(gameState.currentPlayer);
        return true;
    }

    // Check if current player has no valid moves (only in movement phase)
    if (gameState.phase === 'movement') {
        const hasValidMove = checkHasValidMoves(gameState.currentPlayer);
        if (!hasValidMove) {
            showGameOver(opponent);
            return true;
        }
    }

    return false;
}

function checkHasValidMoves(player) {
    const playerPositions = gameState.board
        .map((piece, idx) => piece === player ? idx : -1)
        .filter(idx => idx !== -1);

    const canFly = gameState.pieceCount[player] === 3;

    for (let pos of playerPositions) {
        if (canFly) {
            // Can fly to any empty position
            if (gameState.board.some(piece => piece === null)) {
                return true;
            }
        } else {
            // Check adjacent positions
            const validMoves = adjacencies[pos].filter(adjPos => gameState.board[adjPos] === null);
            if (validMoves.length > 0) {
                return true;
            }
        }
    }

    return false;
}

function updateDisplay() {
    // Update player indicators
    document.getElementById('player1-info').classList.toggle('active', gameState.currentPlayer === 'white');
    document.getElementById('player2-info').classList.toggle('active', gameState.currentPlayer === 'black');

    // Update remaining pieces
    document.getElementById('white-remaining').textContent =
        gameState.phase === 'placement' ? (9 - gameState.whitePlaced) : gameState.pieceCount.white;
    document.getElementById('black-remaining').textContent =
        gameState.phase === 'placement' ? (9 - gameState.blackPlaced) : gameState.pieceCount.black;

    // Update phase display
    let phaseText = '';
    if (gameState.phase === 'placement') {
        phaseText = 'Placement';
    } else if (gameState.phase === 'movement') {
        phaseText = gameState.pieceCount[gameState.currentPlayer] === 3 ? 'Flying' : 'Movement';
    } else if (gameState.phase === 'removal') {
        phaseText = 'Remove opponent piece';
    }
    document.getElementById('current-phase').textContent = phaseText;

    // Update turn display
    document.getElementById('current-turn').textContent =
        gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1);

    // Update action display
    let actionText = '';
    if (gameState.phase === 'placement') {
        actionText = 'Place your piece';
    } else if (gameState.phase === 'removal') {
        actionText = 'Remove opponent piece';
    } else if (gameState.selectedPosition === null) {
        actionText = 'Select piece to move';
    } else {
        actionText = 'Select destination';
    }
    document.getElementById('current-action').textContent = actionText;

    // Update board visualization
    const positions = document.querySelectorAll('.position');
    positions.forEach((pos, idx) => {
        pos.classList.remove('white', 'black', 'selected', 'valid-move', 'removable');

        if (gameState.board[idx] === 'white') {
            pos.classList.add('white', 'occupied');
        } else if (gameState.board[idx] === 'black') {
            pos.classList.add('black', 'occupied');
        } else {
            pos.classList.remove('occupied');
        }

        // Highlight selected piece
        if (idx === gameState.selectedPosition) {
            pos.classList.add('selected');
        }

        // Highlight valid moves
        if (gameState.phase === 'movement' && gameState.selectedPosition !== null && gameState.board[idx] === null) {
            const canFly = gameState.pieceCount[gameState.currentPlayer] === 3;
            const isAdjacent = adjacencies[gameState.selectedPosition].includes(idx);

            if (canFly || isAdjacent) {
                pos.classList.add('valid-move');
            }
        }

        // Highlight removable pieces
        if (gameState.phase === 'removal') {
            const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';
            if (gameState.board[idx] === opponent) {
                // Check if can be removed
                if (!isInMill(idx, opponent)) {
                    pos.classList.add('removable');
                } else {
                    // Check if all opponent pieces are in mills
                    const opponentPositions = gameState.board
                        .map((piece, i) => piece === opponent ? i : -1)
                        .filter(i => i !== -1);

                    const hasNonMillPiece = opponentPositions.some(p => !isInMill(p, opponent));

                    if (!hasNonMillPiece) {
                        pos.classList.add('removable');
                    }
                }
            }
        }
    });
}

function resetGame() {
    gameState.currentPlayer = 'white';
    gameState.phase = 'placement';
    gameState.board = Array(24).fill(null);
    gameState.whitePieces = 9;
    gameState.blackPieces = 9;
    gameState.whitePlaced = 0;
    gameState.blackPlaced = 0;
    gameState.selectedPosition = null;
    gameState.millFormed = false;
    gameState.pieceCount = { white: 0, black: 0 };

    document.getElementById('game-over-modal').style.display = 'none';
    updateDisplay();
}

function showRules() {
    document.getElementById('rules-modal').style.display = 'block';
}

function hideRules() {
    document.getElementById('rules-modal').style.display = 'none';
}

function showGameOver(winner) {
    const winnerText = winner.charAt(0).toUpperCase() + winner.slice(1) + ' wins!';
    document.getElementById('winner-text').textContent = winnerText;
    document.getElementById('game-over-modal').style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);
