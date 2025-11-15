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
    pieceCount: { white: 0, black: 0 },
    gameMode: null, // 'pvp' or 'pva'
    aiDifficulty: 'hard', // 'easy', 'medium', 'hard'
    isAIThinking: false
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

// Strategic positions (corners and intersections are more valuable)
const strategicPositions = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

// Initialize game
function initGame() {
    const positions = document.querySelectorAll('.position');
    positions.forEach(pos => {
        pos.addEventListener('click', handlePositionClick);
    });

    document.getElementById('reset-btn').addEventListener('click', showGameModeModal);
    document.getElementById('rules-btn').addEventListener('click', showRules);
    document.getElementById('new-game-btn').addEventListener('click', showGameModeModal);

    // Game mode selection
    document.getElementById('pvp-btn').addEventListener('click', () => startGame('pvp'));
    document.getElementById('pva-btn').addEventListener('click', () => {
        document.getElementById('difficulty-select').style.display = 'block';
    });

    // Difficulty selection
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.aiDifficulty = e.target.getAttribute('data-difficulty');
            startGame('pva');
        });
    });

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
}

function showGameModeModal() {
    document.getElementById('game-over-modal').style.display = 'none';
    document.getElementById('game-mode-modal').style.display = 'block';
    document.getElementById('difficulty-select').style.display = 'none';
}

function startGame(mode) {
    gameState.gameMode = mode;
    document.getElementById('game-mode-modal').style.display = 'none';
    resetGame();

    // Update player 2 label
    const player2Label = document.querySelector('#player2-info span');
    player2Label.textContent = mode === 'pva' ? 'AI Player' : 'Black Player';
}

function handlePositionClick(e) {
    if (gameState.isAIThinking) return;
    if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') return;

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

        // AI handles removal
        if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
            setTimeout(() => aiRemovePiece(), 1200);
        }
    } else {
        switchPlayer();

        // Check if all pieces are placed
        if (gameState.whitePlaced === 9 && gameState.blackPlaced === 9) {
            gameState.phase = 'movement';
            updateDisplay();
        }

        // AI makes next move
        if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
            setTimeout(() => aiMakeMove(), 800);
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

                // AI handles removal
                if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
                    setTimeout(() => aiRemovePiece(), 1200);
                }
            } else {
                switchPlayer();
                checkGameOver();

                // AI makes next move
                if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
                    setTimeout(() => aiMakeMove(), 800);
                }
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

    // AI makes next move
    if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
        setTimeout(() => aiMakeMove(), 800);
    }
}

// Show/hide removal indicator
function showRemovalIndicator() {
    let indicator = document.getElementById('removal-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'removal-indicator';
        indicator.className = 'removal-indicator';
        document.body.appendChild(indicator);
    }
    indicator.textContent = 'Click an opponent piece to remove it';
    indicator.style.display = 'block';
}

function hideRemovalIndicator() {
    const indicator = document.getElementById('removal-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
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

// ==================== AI LOGIC ====================

function aiMakeMove() {
    if (gameState.isAIThinking) return;
    gameState.isAIThinking = true;

    if (gameState.phase === 'placement') {
        aiPlacePiece();
    } else if (gameState.phase === 'movement') {
        aiMovePiece();
    }

    gameState.isAIThinking = false;
}

function aiPlacePiece() {
    const move = getBestPlacementMove();
    if (move !== null) {
        handlePlacement(move);
    }
}

function aiMovePiece() {
    const move = getBestMovementMove();
    if (move) {
        gameState.selectedPosition = move.from;
        handleMovement(move.to);
    }
}

function aiRemovePiece() {
    const move = getBestRemovalMove();
    if (move !== null) {
        handleRemoval(move);
    }
}

function getBestPlacementMove() {
    const depth = getSearchDepth();
    let bestScore = -Infinity;
    let bestMove = null;

    const emptyPositions = gameState.board
        .map((piece, idx) => piece === null ? idx : -1)
        .filter(idx => idx !== -1);

    for (let pos of emptyPositions) {
        const score = evaluatePlacementMove(pos, depth);
        if (score > bestScore) {
            bestScore = score;
            bestMove = pos;
        }
    }

    return bestMove;
}

function getBestMovementMove() {
    const depth = getSearchDepth();
    let bestScore = -Infinity;
    let bestMove = null;

    const aiPositions = gameState.board
        .map((piece, idx) => piece === 'black' ? idx : -1)
        .filter(idx => idx !== -1);

    const canFly = gameState.pieceCount.black === 3;

    for (let from of aiPositions) {
        const possibleMoves = canFly
            ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
            : adjacencies[from].filter(to => gameState.board[to] === null);

        for (let to of possibleMoves) {
            const score = evaluateMovementMove(from, to, depth);
            if (score > bestScore) {
                bestScore = score;
                bestMove = { from, to };
            }
        }
    }

    return bestMove;
}

function getBestRemovalMove() {
    const depth = getSearchDepth();
    let bestScore = -Infinity;
    let bestMove = null;

    const opponentPositions = gameState.board
        .map((piece, idx) => piece === 'white' ? idx : -1)
        .filter(idx => idx !== -1);

    for (let pos of opponentPositions) {
        // Check if can be removed
        if (isInMill(pos, 'white')) {
            const hasNonMillPiece = opponentPositions.some(p => !isInMill(p, 'white'));
            if (hasNonMillPiece) continue;
        }

        const score = evaluateRemovalMove(pos, depth);
        if (score > bestScore) {
            bestScore = score;
            bestMove = pos;
        }
    }

    return bestMove;
}

function getSearchDepth() {
    switch (gameState.aiDifficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 3;
    }
}

function evaluatePlacementMove(pos, depth) {
    let score = 0;

    // Simulate placing piece
    gameState.board[pos] = 'black';
    gameState.pieceCount.black++;

    // Check if forms mill
    if (isInMill(pos, 'black')) {
        score += 50;
    }

    // Check if blocks opponent mill
    const blocksOpponentMill = checkBlocksMillFormation(pos, 'white');
    if (blocksOpponentMill) {
        score += 30;
    }

    // Check potential mills
    score += countPotentialMills(pos, 'black') * 10;

    // Strategic position bonus
    if (strategicPositions.includes(pos)) {
        score += 15;
    }

    // Evaluate board state
    score += evaluateBoardState() * 5;

    // Undo simulation
    gameState.board[pos] = null;
    gameState.pieceCount.black--;

    // Add randomness for easier difficulties
    if (gameState.aiDifficulty === 'easy') {
        score += Math.random() * 40 - 20;
    } else if (gameState.aiDifficulty === 'medium') {
        score += Math.random() * 20 - 10;
    }

    return score;
}

function evaluateMovementMove(from, to, depth) {
    let score = 0;

    // Simulate move
    gameState.board[to] = 'black';
    gameState.board[from] = null;

    // Check if forms mill
    if (isInMill(to, 'black')) {
        score += 50;
    }

    // Check if blocks opponent mill
    const blocksOpponentMill = checkBlocksMillFormation(to, 'white');
    if (blocksOpponentMill) {
        score += 30;
    }

    // Check potential mills
    score += countPotentialMills(to, 'black') * 10;

    // Strategic position bonus
    if (strategicPositions.includes(to)) {
        score += 15;
    }

    // Mobility bonus
    const mobility = adjacencies[to].filter(adj => gameState.board[adj] === null).length;
    score += mobility * 5;

    // Evaluate board state
    score += evaluateBoardState() * 5;

    // Undo simulation
    gameState.board[from] = 'black';
    gameState.board[to] = null;

    // Add randomness for easier difficulties
    if (gameState.aiDifficulty === 'easy') {
        score += Math.random() * 40 - 20;
    } else if (gameState.aiDifficulty === 'medium') {
        score += Math.random() * 20 - 10;
    }

    return score;
}

function evaluateRemovalMove(pos, depth) {
    let score = 0;

    // Prioritize removing pieces that are part of potential mills
    score += countPotentialMills(pos, 'white') * 20;

    // Prioritize strategic positions
    if (strategicPositions.includes(pos)) {
        score += 25;
    }

    // Prioritize pieces in mills (if all are in mills)
    if (isInMill(pos, 'white')) {
        score += 15;
    }

    // Add randomness for easier difficulties
    if (gameState.aiDifficulty === 'easy') {
        score += Math.random() * 40 - 20;
    } else if (gameState.aiDifficulty === 'medium') {
        score += Math.random() * 20 - 10;
    }

    return score;
}

function evaluateBoardState() {
    let score = 0;

    // Piece count advantage
    score += (gameState.pieceCount.black - gameState.pieceCount.white) * 10;

    // Mill count
    const aiMills = countMills('black');
    const opponentMills = countMills('white');
    score += (aiMills - opponentMills) * 15;

    // Potential mills
    const aiPotentialMills = countAllPotentialMills('black');
    const opponentPotentialMills = countAllPotentialMills('white');
    score += (aiPotentialMills - opponentPotentialMills) * 5;

    return score;
}

function countMills(player) {
    let count = 0;
    for (let mill of mills) {
        if (mill.every(pos => gameState.board[pos] === player)) {
            count++;
        }
    }
    return count;
}

function countPotentialMills(pos, player) {
    let count = 0;
    for (let mill of mills) {
        if (mill.includes(pos)) {
            const playerPieces = mill.filter(p => gameState.board[p] === player).length;
            const emptySpaces = mill.filter(p => gameState.board[p] === null).length;
            if (playerPieces === 2 && emptySpaces === 1) {
                count++;
            }
        }
    }
    return count;
}

function countAllPotentialMills(player) {
    let count = 0;
    for (let mill of mills) {
        const playerPieces = mill.filter(p => gameState.board[p] === player).length;
        const emptySpaces = mill.filter(p => gameState.board[p] === null).length;
        if (playerPieces === 2 && emptySpaces === 1) {
            count++;
        }
    }
    return count;
}

function checkBlocksMillFormation(pos, player) {
    for (let mill of mills) {
        if (mill.includes(pos)) {
            const playerPieces = mill.filter(p => gameState.board[p] === player).length;
            const emptySpaces = mill.filter(p => gameState.board[p] === null).length;
            if (playerPieces === 2 && emptySpaces === 1) {
                return true;
            }
        }
    }
    return false;
}

// ==================== DISPLAY & UI ====================

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
    const turnText = gameState.currentPlayer === 'white' ? 'White' :
                     (gameState.gameMode === 'pva' ? 'AI' : 'Black');
    document.getElementById('current-turn').textContent = turnText;

    // Update action display
    let actionText = '';
    if (gameState.isAIThinking) {
        actionText = 'AI is thinking...';
    } else if (gameState.phase === 'placement') {
        actionText = 'Place your piece';
    } else if (gameState.phase === 'removal') {
        actionText = 'Remove opponent piece';
    } else if (gameState.selectedPosition === null) {
        actionText = 'Select piece to move';
    } else {
        actionText = 'Select destination';
    }
    document.getElementById('current-action').textContent = actionText;

    // Show/hide removal indicator
    if (gameState.phase === 'removal' && gameState.currentPlayer === 'white' && !gameState.isAIThinking) {
        showRemovalIndicator();
    } else {
        hideRemovalIndicator();
    }

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
        if (gameState.phase === 'removal' && gameState.currentPlayer === 'white') {
            const opponent = 'black';
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
    gameState.isAIThinking = false;

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
    const winnerText = winner === 'white' ? 'White wins!' :
                      (gameState.gameMode === 'pva' ? 'AI wins!' : 'Black wins!');
    document.getElementById('winner-text').textContent = winnerText;
    document.getElementById('game-over-modal').style.display = 'block';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);
