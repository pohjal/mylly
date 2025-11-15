// Game state
const gameState = {
    currentPlayer: 'white',
    phase: 'placement', // placement, movement, removal
    board: Array(24).fill(null),
    whitePieces: 9,
    blackPieces: 9,
    whitePlaced: 0,
    blackPlaced: 0,
    piecesToPlace: { white: 9, black: 9 }, // Track pieces left to place
    selectedPosition: null,
    millFormed: false,
    pieceCount: { white: 0, black: 0 },
    gameMode: null, // 'pvp' or 'pva'
    aiDifficulty: 'hard', // 'easy', 'medium', 'hard'
    isAIThinking: false,
    lastAIMove: null, // Track last AI move for highlighting
    justPlaced: null, // Track newly placed piece
    moveFrom: null, // Track position piece moved from
    moveHistory: [], // Track all moves for playback
    isPlaybackMode: false, // Whether we're in playback mode
    playbackIndex: -1, // Current position in playback (-1 = live game)
    removeFromHand: true, // Setting: true = remove from hand during placement, false = remove from board
    soundEnabled: true, // Setting: enable/disable sound effects
    darkTheme: false, // Setting: dark theme enabled
    stateHistory: [], // Track game state snapshots for undo/redo
    historyIndex: -1, // Current position in state history
    currentGameRecord: null, // Current game being played
    savedGames: [], // List of saved game records
    hintPosition: null, // Position suggested by hint
    hintFromPosition: null, // Source position for movement hint
    stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0
    }
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

// ==================== AUDIO SYSTEM ====================

// Audio context for sound effects
let audioContext;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!gameState.soundEnabled || !audioContext) return;

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
        case 'place':
            // Short click sound
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;

        case 'mill':
            // Pleasant chime for forming a mill
            oscillator.frequency.value = 523.25; // C5
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            oscillator.start(now);
            oscillator.stop(now + 0.4);

            // Add second note for harmony
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.frequency.value = 659.25; // E5
                osc2.type = 'sine';
                const t = audioContext.currentTime;
                gain2.gain.setValueAtTime(0.15, t);
                gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
                osc2.start(t);
                osc2.stop(t + 0.4);
            }, 100);
            break;

        case 'remove':
            // Lower sound for piece removal
            oscillator.frequency.value = 200;
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(0.15, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            oscillator.start(now);
            oscillator.stop(now + 0.2);
            break;

        case 'win':
            // Victory fanfare
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    const t = audioContext.currentTime;
                    gain.gain.setValueAtTime(0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
                    osc.start(t);
                    osc.stop(t + 0.5);
                }, i * 150);
            });
            break;

        case 'lose':
            // Descending notes for loss
            [392, 349.23, 293.66].forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    osc.frequency.value = freq;
                    osc.type = 'triangle';
                    const t = audioContext.currentTime;
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                    osc.start(t);
                    osc.stop(t + 0.3);
                }, i * 120);
            });
            break;
    }
}

// Initialize game
function initGame() {
    initAudio();
    loadStats(); // Load saved stats and settings

    const positions = document.querySelectorAll('.position');
    positions.forEach(pos => {
        pos.addEventListener('click', handlePositionClick);
    });

    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    document.getElementById('redo-btn').addEventListener('click', redoMove);
    document.getElementById('reset-btn').addEventListener('click', showGameModeModal);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('stats-btn').addEventListener('click', showStats);
    document.getElementById('analysis-btn').addEventListener('click', showAnalysis);
    document.getElementById('rules-btn').addEventListener('click', showRules);
    document.getElementById('new-game-btn').addEventListener('click', showGameModeModal);

    // Settings toggles
    const removalToggle = document.getElementById('removal-variant-toggle');
    removalToggle.checked = gameState.removeFromHand;
    document.getElementById('removal-variant-toggle').addEventListener('change', handleRemovalVariantToggle);

    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.checked = gameState.soundEnabled;
    document.getElementById('sound-toggle').addEventListener('change', handleSoundToggle);

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.checked = gameState.darkTheme;
    document.getElementById('theme-toggle').addEventListener('change', handleThemeToggle);

    // Apply theme on load
    applyTheme();

    document.getElementById('close-settings').addEventListener('click', hideSettings);
    document.getElementById('close-stats').addEventListener('click', hideStats);
    document.getElementById('close-analysis').addEventListener('click', hideAnalysis);

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
        const settingsModal = document.getElementById('settings-modal');
        const statsModal = document.getElementById('stats-modal');
        const analysisModal = document.getElementById('analysis-modal');
        if (e.target === rulesModal) {
            hideRules();
        }
        if (e.target === settingsModal) {
            hideSettings();
        }
        if (e.target === statsModal) {
            hideStats();
        }
        if (e.target === analysisModal) {
            hideAnalysis();
        }
    });

    // Playback controls
    document.getElementById('first-move-btn').addEventListener('click', () => goToMove(0));
    document.getElementById('prev-move-btn').addEventListener('click', previousMove);
    document.getElementById('next-move-btn').addEventListener('click', nextMove);
    document.getElementById('last-move-btn').addEventListener('click', () => goToMove(gameState.moveHistory.length - 1));
    document.getElementById('exit-playback-btn').addEventListener('click', exitPlayback);
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
    if (gameState.isPlaybackMode) return; // Prevent moves during playback
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

    // Save state before making the move
    saveState();

    // Place piece
    gameState.board[posIndex] = gameState.currentPlayer;
    gameState.justPlaced = posIndex;

    // Play sound effect
    playSound('place');

    // Clear animation after it completes
    setTimeout(() => {
        if (gameState.justPlaced === posIndex) {
            gameState.justPlaced = null;
        }
    }, 400);

    if (gameState.currentPlayer === 'white') {
        gameState.whitePlaced++;
        gameState.pieceCount.white++;
        gameState.piecesToPlace.white--;
    } else {
        gameState.blackPlaced++;
        gameState.pieceCount.black++;
        gameState.piecesToPlace.black--;
    }

    // Record move
    recordMove('place', posIndex);

    updateDisplay();

    // Check for mill
    if (isInMill(posIndex, gameState.currentPlayer)) {
        gameState.millFormed = true;

        // Play mill sound
        playSound('mill');

        // Check if we should remove from hand (placement phase only)
        const inPlacementPhase = (gameState.whitePlaced < 9 || gameState.blackPlaced < 9);
        if (gameState.removeFromHand && inPlacementPhase) {
            // Remove from hand variant: reduce opponent's pieces to place
            const opponent = gameState.currentPlayer === 'white' ? 'black' : 'white';
            if (gameState.piecesToPlace[opponent] > 0) {
                gameState.piecesToPlace[opponent]--;

                // Record the hand removal in move history
                recordMove('remove-hand', -1);
            }

            gameState.millFormed = false;
            switchPlayer();

            // Check if all pieces are placed
            if (gameState.whitePlaced === 9 && gameState.blackPlaced === 9) {
                gameState.phase = 'movement';
            }

            updateDisplay();

            // AI makes next move
            if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
                setTimeout(() => aiMakeMove(), 800);
            }
        } else {
            // Standard variant: remove from board
            gameState.phase = 'removal';
            updateDisplay();

            // AI handles removal
            if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') {
                setTimeout(() => aiRemovePiece(), 1200);
            }
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
            // Save state before making the move
            saveState();

            // Move piece
            const movedFrom = gameState.selectedPosition;
            gameState.board[posIndex] = gameState.currentPlayer;
            gameState.board[movedFrom] = null;
            gameState.selectedPosition = null;

            // Play sound effect
            playSound('place');

            // Set animation states
            gameState.justPlaced = posIndex;
            gameState.moveFrom = movedFrom;

            // Clear animations after they complete
            setTimeout(() => {
                if (gameState.justPlaced === posIndex) {
                    gameState.justPlaced = null;
                }
            }, 400);
            setTimeout(() => {
                if (gameState.moveFrom === movedFrom) {
                    gameState.moveFrom = null;
                }
            }, 600);

            // Record move
            recordMove('move', posIndex, movedFrom);

            updateDisplay();

            // Check for mill
            if (isInMill(posIndex, gameState.currentPlayer)) {
                gameState.millFormed = true;
                gameState.phase = 'removal';

                // Play mill sound
                playSound('mill');

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

    // Save state before making the move
    saveState();

    // Remove piece
    gameState.board[posIndex] = null;
    gameState.pieceCount[opponent]--;

    // Play sound effect
    playSound('remove');

    // Record move
    recordMove('remove', posIndex);

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

// Record move in history
function recordMove(type, position, fromPos = null) {
    if (gameState.isPlaybackMode) return; // Don't record during playback

    const move = {
        type: type, // 'place', 'move', 'remove'
        player: gameState.currentPlayer,
        position: position,
        from: fromPos,
        boardState: [...gameState.board],
        whitePieces: gameState.pieceCount.white,
        blackPieces: gameState.pieceCount.black,
        moveNumber: gameState.moveHistory.length + 1
    };

    gameState.moveHistory.push(move);

    // Also save to game record
    if (gameState.currentGameRecord) {
        gameState.currentGameRecord.moves.push({
            type: type,
            player: gameState.currentPlayer,
            position: position,
            from: fromPos,
            moveNumber: move.moveNumber
        });
    }

    showPlaybackControls();
    updateMoveCounter();
}

function showPlaybackControls() {
    const controls = document.getElementById('playback-controls');
    if (gameState.moveHistory.length > 0) {
        controls.style.display = 'flex';
    } else {
        controls.style.display = 'none';
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
        gameState.lastAIMove = move;
        handlePlacement(move);
    }
}

function aiMovePiece() {
    const move = getBestMovementMove();
    if (move) {
        gameState.selectedPosition = move.from;
        gameState.lastAIMove = move.to;
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
    let alpha = -Infinity;
    let beta = Infinity;

    const emptyPositions = gameState.board
        .map((piece, idx) => piece === null ? idx : -1)
        .filter(idx => idx !== -1);

    // Add randomness for easier difficulties
    if (gameState.aiDifficulty === 'easy' && Math.random() < 0.25) {
        return emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
    }

    // Move ordering: prioritize moves that form mills or are strategic
    const orderedPositions = orderPlacementMoves(emptyPositions, 'black');

    for (let pos of orderedPositions) {
        // Simulate placing piece
        gameState.board[pos] = 'black';
        gameState.pieceCount.black++;
        const piecesToPlace = gameState.piecesToPlace.black;
        gameState.piecesToPlace.black--;

        let score;
        if (isInMill(pos, 'black')) {
            // If forms mill, need to evaluate removal
            score = getBestRemovalScore(depth - 1, alpha, beta, false);
        } else {
            // Continue with opponent's turn
            score = minimaxPlacement(depth - 1, alpha, beta, false);
        }

        // Undo simulation
        gameState.board[pos] = null;
        gameState.pieceCount.black--;
        gameState.piecesToPlace.black = piecesToPlace;

        if (score > bestScore) {
            bestScore = score;
            bestMove = pos;
        }

        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Beta cutoff
    }

    return bestMove;
}

function getBestMovementMove() {
    const depth = getSearchDepth();
    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;

    const aiPositions = gameState.board
        .map((piece, idx) => piece === 'black' ? idx : -1)
        .filter(idx => idx !== -1);

    const canFly = gameState.pieceCount.black === 3;

    // Add randomness for easier difficulties
    if (gameState.aiDifficulty === 'easy' && Math.random() < 0.25) {
        const from = aiPositions[Math.floor(Math.random() * aiPositions.length)];
        const possibleMoves = canFly
            ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
            : adjacencies[from].filter(to => gameState.board[to] === null);
        if (possibleMoves.length > 0) {
            const to = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            return { from, to };
        }
    }

    // Generate and order all possible moves
    const allMoves = [];
    for (let from of aiPositions) {
        const possibleMoves = canFly
            ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
            : adjacencies[from].filter(to => gameState.board[to] === null);

        for (let to of possibleMoves) {
            allMoves.push({ from, to });
        }
    }

    // Order moves by heuristic quality
    const orderedMoves = orderMovementMoves(allMoves, 'black');

    for (let move of orderedMoves) {
        const { from, to } = move;
        // Simulate move
        gameState.board[to] = 'black';
        gameState.board[from] = null;

        let score;
        if (isInMill(to, 'black')) {
            // If forms mill, need to evaluate removal
            score = getBestRemovalScore(depth - 1, alpha, beta, false);
        } else {
            // Continue with opponent's turn
            score = minimaxMovement(depth - 1, alpha, beta, false);
        }

        // Undo simulation
        gameState.board[from] = 'black';
        gameState.board[to] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = { from, to };
        }

        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Beta cutoff
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
        case 'medium': return 3;
        case 'hard': return 5;
        default: return 5;
    }
}

// Minimax with alpha-beta pruning for placement phase
function minimaxPlacement(depth, alpha, beta, isMaximizing) {
    // Check terminal states
    if (gameState.pieceCount.white <= 2 && gameState.piecesToPlace.white === 0) {
        return 10000; // AI wins
    }
    if (gameState.pieceCount.black <= 2 && gameState.piecesToPlace.black === 0) {
        return -10000; // AI loses
    }

    // Check if placement phase is over
    if (gameState.piecesToPlace.white === 0 && gameState.piecesToPlace.black === 0) {
        return minimaxMovement(depth, alpha, beta, isMaximizing);
    }

    if (depth === 0) {
        return evaluateBoardState();
    }

    const player = isMaximizing ? 'black' : 'white';
    const piecesToPlace = isMaximizing ? gameState.piecesToPlace.black : gameState.piecesToPlace.white;

    if (piecesToPlace === 0) {
        return minimaxMovement(depth, alpha, beta, isMaximizing);
    }

    const emptyPositions = gameState.board
        .map((piece, idx) => piece === null ? idx : -1)
        .filter(idx => idx !== -1);

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let pos of emptyPositions) {
            gameState.board[pos] = player;
            gameState.pieceCount[player]++;
            gameState.piecesToPlace[player]--;

            let score;
            if (isInMill(pos, player)) {
                score = getBestRemovalScore(depth - 1, alpha, beta, false);
            } else {
                score = minimaxPlacement(depth - 1, alpha, beta, false);
            }

            gameState.board[pos] = null;
            gameState.pieceCount[player]--;
            gameState.piecesToPlace[player]++;

            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let pos of emptyPositions) {
            gameState.board[pos] = player;
            gameState.pieceCount[player]++;
            gameState.piecesToPlace[player]--;

            let score;
            if (isInMill(pos, player)) {
                score = getWorstRemovalScore(depth - 1, alpha, beta, true);
            } else {
                score = minimaxPlacement(depth - 1, alpha, beta, true);
            }

            gameState.board[pos] = null;
            gameState.pieceCount[player]--;
            gameState.piecesToPlace[player]++;

            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

// Minimax with alpha-beta pruning for movement phase
function minimaxMovement(depth, alpha, beta, isMaximizing) {
    // Check terminal states
    if (gameState.pieceCount.white <= 2) return 10000; // AI wins
    if (gameState.pieceCount.black <= 2) return -10000; // AI loses

    if (depth === 0) {
        return evaluateBoardState();
    }

    const player = isMaximizing ? 'black' : 'white';
    const playerPositions = gameState.board
        .map((piece, idx) => piece === player ? idx : -1)
        .filter(idx => idx !== -1);

    const canFly = gameState.pieceCount[player] === 3;

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let from of playerPositions) {
            const possibleMoves = canFly
                ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
                : adjacencies[from].filter(to => gameState.board[to] === null);

            for (let to of possibleMoves) {
                gameState.board[to] = player;
                gameState.board[from] = null;

                let score;
                if (isInMill(to, player)) {
                    score = getBestRemovalScore(depth - 1, alpha, beta, false);
                } else {
                    score = minimaxMovement(depth - 1, alpha, beta, false);
                }

                gameState.board[from] = player;
                gameState.board[to] = null;

                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let from of playerPositions) {
            const possibleMoves = canFly
                ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
                : adjacencies[from].filter(to => gameState.board[to] === null);

            for (let to of possibleMoves) {
                gameState.board[to] = player;
                gameState.board[from] = null;

                let score;
                if (isInMill(to, player)) {
                    score = getWorstRemovalScore(depth - 1, alpha, beta, true);
                } else {
                    score = minimaxMovement(depth - 1, alpha, beta, true);
                }

                gameState.board[from] = player;
                gameState.board[to] = null;

                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

// Get best score after AI removes opponent piece
function getBestRemovalScore(depth, alpha, beta, nextIsMaximizing) {
    const opponentPositions = gameState.board
        .map((piece, idx) => piece === 'white' ? idx : -1)
        .filter(idx => idx !== -1);

    let bestScore = -Infinity;

    for (let pos of opponentPositions) {
        if (isInMill(pos, 'white')) {
            const hasNonMillPiece = opponentPositions.some(p => !isInMill(p, 'white'));
            if (hasNonMillPiece) continue;
        }

        gameState.board[pos] = null;
        gameState.pieceCount.white--;

        const score = gameState.piecesToPlace.white > 0 || gameState.piecesToPlace.black > 0
            ? minimaxPlacement(depth, alpha, beta, nextIsMaximizing)
            : minimaxMovement(depth, alpha, beta, nextIsMaximizing);

        gameState.board[pos] = 'white';
        gameState.pieceCount.white++;

        bestScore = Math.max(bestScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
    }

    return bestScore;
}

// Get worst score after opponent removes AI piece
function getWorstRemovalScore(depth, alpha, beta, nextIsMaximizing) {
    const aiPositions = gameState.board
        .map((piece, idx) => piece === 'black' ? idx : -1)
        .filter(idx => idx !== -1);

    let worstScore = Infinity;

    for (let pos of aiPositions) {
        if (isInMill(pos, 'black')) {
            const hasNonMillPiece = aiPositions.some(p => !isInMill(p, 'black'));
            if (hasNonMillPiece) continue;
        }

        gameState.board[pos] = null;
        gameState.pieceCount.black--;

        const score = gameState.piecesToPlace.white > 0 || gameState.piecesToPlace.black > 0
            ? minimaxPlacement(depth, alpha, beta, nextIsMaximizing)
            : minimaxMovement(depth, alpha, beta, nextIsMaximizing);

        gameState.board[pos] = 'black';
        gameState.pieceCount.black++;

        worstScore = Math.min(worstScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
    }

    return worstScore;
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

    // Piece count advantage (very important in endgame)
    const pieceDiff = gameState.pieceCount.black - gameState.pieceCount.white;
    score += pieceDiff * 50;

    // Mill count
    const aiMills = countMills('black');
    const opponentMills = countMills('white');
    score += (aiMills - opponentMills) * 20;

    // Potential mills (two pieces in a row with empty third)
    const aiPotentialMills = countAllPotentialMills('black');
    const opponentPotentialMills = countAllPotentialMills('white');
    score += (aiPotentialMills - opponentPotentialMills) * 10;

    // Blocked mills (opponent has two pieces, we have the third)
    const aiBlockedOpponentMills = countBlockedMills('white', 'black');
    score += aiBlockedOpponentMills * 15;

    // Mobility (number of possible moves)
    const aiMobility = countMobility('black');
    const opponentMobility = countMobility('white');
    score += (aiMobility - opponentMobility) * 3;

    // Double mill opportunities (piece involved in multiple potential mills)
    const aiDoubleMills = countDoubleMills('black');
    const opponentDoubleMills = countDoubleMills('white');
    score += (aiDoubleMills - opponentDoubleMills) * 8;

    // Strategic positions (corners and intersections)
    const aiStrategic = countStrategicPositions('black');
    const opponentStrategic = countStrategicPositions('white');
    score += (aiStrategic - opponentStrategic) * 4;

    // Winning/losing detection
    if (gameState.pieceCount.white <= 2) score += 10000;
    if (gameState.pieceCount.black <= 2) score -= 10000;

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

// Count mills that are blocked (opponent has 2 pieces, we have the blocking third)
function countBlockedMills(opponent, blocker) {
    let count = 0;
    for (let mill of mills) {
        const opponentPieces = mill.filter(p => gameState.board[p] === opponent).length;
        const blockerPieces = mill.filter(p => gameState.board[p] === blocker).length;
        if (opponentPieces === 2 && blockerPieces === 1) {
            count++;
        }
    }
    return count;
}

// Count mobility (number of valid moves available)
function countMobility(player) {
    if (gameState.phase === 'placement') {
        // During placement, mobility is number of empty positions
        return gameState.board.filter(p => p === null).length;
    }

    let moves = 0;
    const canFly = gameState.pieceCount[player] === 3;
    const playerPositions = gameState.board
        .map((piece, idx) => piece === player ? idx : -1)
        .filter(idx => idx !== -1);

    for (let pos of playerPositions) {
        if (canFly) {
            // Can move anywhere
            moves += gameState.board.filter(p => p === null).length;
        } else {
            // Can only move to adjacent empty positions
            moves += adjacencies[pos].filter(adj => gameState.board[adj] === null).length;
        }
    }
    return moves;
}

// Count double mill opportunities (positions involved in 2+ potential mills)
function countDoubleMills(player) {
    let count = 0;
    const playerPositions = gameState.board
        .map((piece, idx) => piece === player ? idx : -1)
        .filter(idx => idx !== -1);

    for (let pos of playerPositions) {
        const potentialMills = countPotentialMills(pos, player);
        if (potentialMills >= 2) {
            count++;
        }
    }
    return count;
}

// Count pieces on strategic positions
function countStrategicPositions(player) {
    let count = 0;
    for (let pos of strategicPositions) {
        if (gameState.board[pos] === player) {
            count++;
        }
    }
    return count;
}

// Move ordering for better alpha-beta pruning
function orderPlacementMoves(positions, player) {
    const scored = positions.map(pos => {
        let score = 0;

        // Temporarily place piece to evaluate
        gameState.board[pos] = player;

        // Prioritize forming mills
        if (isInMill(pos, player)) score += 1000;

        // Prioritize blocking opponent mills
        const opponent = player === 'black' ? 'white' : 'black';
        if (checkBlocksMillFormation(pos, opponent)) score += 500;

        // Prioritize creating potential mills
        score += countPotentialMills(pos, player) * 100;

        // Prioritize strategic positions
        if (strategicPositions.includes(pos)) score += 50;

        // Restore board
        gameState.board[pos] = null;

        return { pos, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.pos);
}

function orderMovementMoves(moves, player) {
    const scored = moves.map(move => {
        let score = 0;
        const { from, to } = move;

        // Temporarily make move to evaluate
        gameState.board[to] = player;
        gameState.board[from] = null;

        // Prioritize forming mills
        if (isInMill(to, player)) score += 1000;

        // Prioritize blocking opponent mills
        const opponent = player === 'black' ? 'white' : 'black';
        if (checkBlocksMillFormation(to, opponent)) score += 500;

        // Prioritize creating potential mills
        score += countPotentialMills(to, player) * 100;

        // Prioritize strategic positions
        if (strategicPositions.includes(to)) score += 50;

        // Prioritize mobility
        const mobility = adjacencies[to].filter(adj => gameState.board[adj] === null).length;
        score += mobility * 10;

        // Restore board
        gameState.board[from] = player;
        gameState.board[to] = null;

        return { move, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map(item => item.move);
}

// ==================== DISPLAY & UI ====================

function updateDisplay() {
    // Update player indicators
    document.getElementById('player1-info').classList.toggle('active', gameState.currentPlayer === 'white');
    document.getElementById('player2-info').classList.toggle('active', gameState.currentPlayer === 'black');

    // Update remaining pieces
    const inPlacementPhase = (gameState.whitePlaced < 9 || gameState.blackPlaced < 9);

    document.getElementById('white-pieces-label').textContent = inPlacementPhase ? 'To Place:' : 'On Board:';
    document.getElementById('black-pieces-label').textContent = inPlacementPhase ? 'To Place:' : 'On Board:';

    document.getElementById('white-remaining').textContent =
        inPlacementPhase ? gameState.piecesToPlace.white : gameState.pieceCount.white;
    document.getElementById('black-remaining').textContent =
        inPlacementPhase ? gameState.piecesToPlace.black : gameState.pieceCount.black;

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

    // Show/hide AI thinking indicator
    const aiIndicator = document.getElementById('ai-thinking-indicator');
    if (aiIndicator) {
        aiIndicator.style.display = gameState.isAIThinking ? 'flex' : 'none';
    }

    // Show/hide removal indicator
    if (gameState.phase === 'removal' && gameState.currentPlayer === 'white' && !gameState.isAIThinking) {
        showRemovalIndicator();
    } else {
        hideRemovalIndicator();
    }

    // Update board visualization
    const positions = document.querySelectorAll('.position');
    positions.forEach((pos, idx) => {
        pos.classList.remove('white', 'black', 'selected', 'valid-move', 'removable', 'ai-just-moved', 'just-placed', 'move-from', 'hint', 'hint-from');

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

        // Highlight hint positions
        if (idx === gameState.hintPosition) {
            pos.classList.add('hint');
        }
        if (idx === gameState.hintFromPosition) {
            pos.classList.add('hint-from');
        }

        // Highlight AI's last move
        if (idx === gameState.lastAIMove && gameState.gameMode === 'pva') {
            pos.classList.add('ai-just-moved');
        }

        // Animate newly placed piece
        if (idx === gameState.justPlaced) {
            pos.classList.add('just-placed');
        }

        // Animate position piece moved from
        if (idx === gameState.moveFrom) {
            pos.classList.add('move-from');
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

    // Update undo/redo button states
    updateUndoRedoButtons();
}

function resetGame() {
    gameState.currentPlayer = 'white';
    gameState.phase = 'placement';
    gameState.board = Array(24).fill(null);
    gameState.whitePieces = 9;
    gameState.blackPieces = 9;
    gameState.whitePlaced = 0;
    gameState.blackPlaced = 0;
    gameState.piecesToPlace = { white: 9, black: 9 };
    gameState.selectedPosition = null;
    gameState.millFormed = false;
    gameState.pieceCount = { white: 0, black: 0 };
    gameState.isAIThinking = false;
    gameState.lastAIMove = null;
    gameState.justPlaced = null;
    gameState.moveFrom = null;
    gameState.moveHistory = [];
    gameState.isPlaybackMode = false;
    gameState.playbackIndex = -1;
    gameState.stateHistory = [];
    gameState.historyIndex = -1;

    // Initialize new game record
    gameState.currentGameRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        gameMode: gameState.gameMode,
        aiDifficulty: gameState.aiDifficulty,
        moves: [],
        winner: null,
        endTime: null
    };

    document.getElementById('game-over-modal').style.display = 'none';
    showPlaybackControls();
    updateDisplay();

    // Save initial state
    saveState();
}

function showRules() {
    document.getElementById('rules-modal').style.display = 'block';
}

function hideRules() {
    document.getElementById('rules-modal').style.display = 'none';
}

function showSettings() {
    document.getElementById('settings-modal').style.display = 'block';
}

function hideSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function handleRemovalVariantToggle(e) {
    gameState.removeFromHand = e.target.checked;

    // Update label styling
    const fromBoardLabel = document.getElementById('removal-from-board');
    const fromHandLabel = document.getElementById('removal-from-hand');

    if (gameState.removeFromHand) {
        fromBoardLabel.classList.remove('active');
        fromHandLabel.classList.add('active');
    } else {
        fromBoardLabel.classList.add('active');
        fromHandLabel.classList.remove('active');
    }

    saveStats();
}

function handleSoundToggle(e) {
    gameState.soundEnabled = e.target.checked;

    // Update label styling
    const soundOffLabel = document.getElementById('sound-off');
    const soundOnLabel = document.getElementById('sound-on');

    if (gameState.soundEnabled) {
        soundOffLabel.classList.remove('active');
        soundOnLabel.classList.add('active');
    } else {
        soundOffLabel.classList.add('active');
        soundOnLabel.classList.remove('active');
    }

    saveStats();
}

function handleThemeToggle(e) {
    gameState.darkTheme = e.target.checked;

    // Update label styling
    const lightLabel = document.getElementById('theme-light');
    const darkLabel = document.getElementById('theme-dark');

    if (gameState.darkTheme) {
        lightLabel.classList.remove('active');
        darkLabel.classList.add('active');
    } else {
        lightLabel.classList.add('active');
        darkLabel.classList.remove('active');
    }

    applyTheme();
    saveStats();
}

function applyTheme() {
    if (gameState.darkTheme) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function showStats() {
    updateStatsDisplay();
    document.getElementById('stats-modal').style.display = 'block';
}

function hideStats() {
    document.getElementById('stats-modal').style.display = 'none';
}

function updateStatsDisplay() {
    const stats = gameState.stats;
    document.getElementById('stat-games').textContent = stats.gamesPlayed;
    document.getElementById('stat-wins').textContent = stats.wins;
    document.getElementById('stat-losses').textContent = stats.losses;
    document.getElementById('stat-draws').textContent = stats.draws;

    const winRate = stats.gamesPlayed > 0
        ? Math.round((stats.wins / stats.gamesPlayed) * 100)
        : 0;
    document.getElementById('stat-winrate').textContent = winRate + '%';

    document.getElementById('stat-streak').textContent = stats.currentStreak;
    document.getElementById('stat-best-streak').textContent = stats.bestStreak;
}

function showAnalysis() {
    displayGamesList();
    document.getElementById('analysis-modal').style.display = 'block';
}

function hideAnalysis() {
    document.getElementById('analysis-modal').style.display = 'none';
}

function displayGamesList() {
    const gamesList = document.getElementById('games-list');

    if (gameState.savedGames.length === 0) {
        gamesList.innerHTML = '<p class="no-games">No games recorded yet. Finish a game to see it here for analysis.</p>';
        return;
    }

    gamesList.innerHTML = '';

    gameState.savedGames.forEach((game, index) => {
        const gameDiv = document.createElement('div');
        gameDiv.className = 'game-record';

        const date = new Date(game.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let result = 'Draw';
        let resultClass = 'draw';
        if (game.gameMode === 'pva') {
            if (game.winner === 'white') {
                result = 'Win';
                resultClass = 'win';
            } else if (game.winner === 'black') {
                result = 'Loss';
                resultClass = 'loss';
            }
        } else {
            result = game.winner === 'white' ? 'White Won' : 'Black Won';
            resultClass = game.winner === 'white' ? 'win' : 'loss';
        }

        const modeText = game.gameMode === 'pva'
            ? `vs AI (${game.aiDifficulty})`
            : 'vs Player';

        gameDiv.innerHTML = `
            <div class="game-record-header">
                <div class="game-date">${dateStr}</div>
                <div class="game-result ${resultClass}">${result}</div>
            </div>
            <div class="game-details">
                <div class="game-detail-item">Mode: ${modeText}</div>
                <div class="game-detail-item">Moves: ${game.moves.length}</div>
            </div>
        `;

        gameDiv.addEventListener('click', () => analyzeGame(game));
        gamesList.appendChild(gameDiv);
    });
}

function analyzeGame(game) {
    // For now, just show an alert with game info
    // In a full implementation, this would open a detailed analysis view
    alert(`Game Analysis\n\nDate: ${new Date(game.date).toLocaleString()}\nMode: ${game.gameMode}\nMoves: ${game.moves.length}\nWinner: ${game.winner}\n\nDetailed analysis feature coming soon!`);
}

// ==================== HINT SYSTEM ====================

function showHint() {
    // Can't show hint during playback, AI turn, or removal phase
    if (gameState.isPlaybackMode || gameState.isAIThinking) return;

    // In AI mode, only show hints for white player
    if (gameState.gameMode === 'pva' && gameState.currentPlayer === 'black') return;

    // Clear previous hint
    gameState.hintPosition = null;
    gameState.hintFromPosition = null;

    let hint = null;

    if (gameState.phase === 'placement') {
        hint = getBestMoveForPlayer(gameState.currentPlayer, 'placement');
        if (hint !== null) {
            gameState.hintPosition = hint;
        }
    } else if (gameState.phase === 'movement') {
        hint = getBestMoveForPlayer(gameState.currentPlayer, 'movement');
        if (hint) {
            gameState.hintPosition = hint.to;
            gameState.hintFromPosition = hint.from;
        }
    } else if (gameState.phase === 'removal') {
        hint = getBestMoveForPlayer(gameState.currentPlayer, 'removal');
        if (hint !== null) {
            gameState.hintPosition = hint;
        }
    }

    updateDisplay();

    // Clear hint after 3 seconds
    setTimeout(() => {
        gameState.hintPosition = null;
        gameState.hintFromPosition = null;
        updateDisplay();
    }, 3000);
}

function getBestMoveForPlayer(player, phase) {
    const depth = 2; // Use depth 2 for hints to keep it fast

    if (phase === 'placement') {
        return getBestPlacementMoveForPlayer(player, depth);
    } else if (phase === 'movement') {
        return getBestMovementMoveForPlayer(player, depth);
    } else if (phase === 'removal') {
        return getBestRemovalMoveForPlayer(player);
    }

    return null;
}

function getBestPlacementMoveForPlayer(player, depth) {
    let bestScore = -Infinity;
    let bestMove = null;

    const emptyPositions = gameState.board
        .map((piece, idx) => piece === null ? idx : -1)
        .filter(idx => idx !== -1);

    // Order positions for better evaluation
    const orderedPositions = orderPlacementMoves(emptyPositions, player);

    for (let pos of orderedPositions) {
        // Simulate placing piece
        gameState.board[pos] = player;

        let score = evaluateBoardStateForPlayer(player);

        // Bonus for forming a mill
        if (isInMill(pos, player)) {
            score += 100;
        }

        // Undo simulation
        gameState.board[pos] = null;

        if (score > bestScore) {
            bestScore = score;
            bestMove = pos;
        }
    }

    return bestMove;
}

function getBestMovementMoveForPlayer(player, depth) {
    let bestScore = -Infinity;
    let bestMove = null;

    const playerPositions = gameState.board
        .map((piece, idx) => piece === player ? idx : -1)
        .filter(idx => idx !== -1);

    const canFly = gameState.pieceCount[player] === 3;

    for (let from of playerPositions) {
        const possibleMoves = canFly
            ? gameState.board.map((piece, idx) => piece === null ? idx : -1).filter(idx => idx !== -1)
            : adjacencies[from].filter(to => gameState.board[to] === null);

        for (let to of possibleMoves) {
            // Simulate move
            gameState.board[to] = player;
            gameState.board[from] = null;

            let score = evaluateBoardStateForPlayer(player);

            // Bonus for forming a mill
            if (isInMill(to, player)) {
                score += 100;
            }

            // Undo simulation
            gameState.board[from] = player;
            gameState.board[to] = null;

            if (score > bestScore) {
                bestScore = score;
                bestMove = { from, to };
            }
        }
    }

    return bestMove;
}

function getBestRemovalMoveForPlayer(player) {
    const opponent = player === 'white' ? 'black' : 'white';
    let bestScore = -Infinity;
    let bestMove = null;

    const opponentPositions = gameState.board
        .map((piece, idx) => piece === opponent ? idx : -1)
        .filter(idx => idx !== -1);

    for (let pos of opponentPositions) {
        // Check if can be removed
        if (isInMill(pos, opponent)) {
            const hasNonMillPiece = opponentPositions.some(p => !isInMill(p, opponent));
            if (hasNonMillPiece) continue; // Can't remove from mill
        }

        // Simulate removal
        gameState.board[pos] = null;
        gameState.pieceCount[opponent]--;

        const score = evaluateBoardStateForPlayer(player);

        // Undo simulation
        gameState.board[pos] = opponent;
        gameState.pieceCount[opponent]++;

        if (score > bestScore) {
            bestScore = score;
            bestMove = pos;
        }
    }

    return bestMove;
}

function evaluateBoardStateForPlayer(player) {
    const opponent = player === 'white' ? 'black' : 'white';
    let score = 0;

    // Piece count advantage
    const pieceDiff = gameState.pieceCount[player] - gameState.pieceCount[opponent];
    score += pieceDiff * 50;

    // Mill count
    const playerMills = countMills(player);
    const opponentMills = countMills(opponent);
    score += (playerMills - opponentMills) * 20;

    // Potential mills
    const playerPotentialMills = countAllPotentialMills(player);
    const opponentPotentialMills = countAllPotentialMills(opponent);
    score += (playerPotentialMills - opponentPotentialMills) * 10;

    return score;
}

// ==================== UNDO/REDO ====================

function saveState() {
    // Don't save state during playback or AI thinking
    if (gameState.isPlaybackMode || gameState.isAIThinking) return;

    // Create a snapshot of the current state
    const snapshot = {
        currentPlayer: gameState.currentPlayer,
        phase: gameState.phase,
        board: [...gameState.board],
        whitePieces: gameState.whitePieces,
        blackPieces: gameState.blackPieces,
        whitePlaced: gameState.whitePlaced,
        blackPlaced: gameState.blackPlaced,
        piecesToPlace: { ...gameState.piecesToPlace },
        pieceCount: { ...gameState.pieceCount },
        millFormed: gameState.millFormed
    };

    // Remove any states after current index (for redo history)
    gameState.stateHistory = gameState.stateHistory.slice(0, gameState.historyIndex + 1);

    // Add the new state
    gameState.stateHistory.push(snapshot);
    gameState.historyIndex++;

    // Keep history limited to last 50 states
    if (gameState.stateHistory.length > 50) {
        gameState.stateHistory.shift();
        gameState.historyIndex--;
    }

    updateUndoRedoButtons();
}

function restoreState(snapshot) {
    gameState.currentPlayer = snapshot.currentPlayer;
    gameState.phase = snapshot.phase;
    gameState.board = [...snapshot.board];
    gameState.whitePieces = snapshot.whitePieces;
    gameState.blackPieces = snapshot.blackPieces;
    gameState.whitePlaced = snapshot.whitePlaced;
    gameState.blackPlaced = snapshot.blackPlaced;
    gameState.piecesToPlace = { ...snapshot.piecesToPlace };
    gameState.pieceCount = { ...snapshot.pieceCount };
    gameState.millFormed = snapshot.millFormed;
    gameState.selectedPosition = null;
    gameState.lastAIMove = null;
    gameState.justPlaced = null;
    gameState.moveFrom = null;

    updateDisplay();
    updateUndoRedoButtons();
}

function undoMove() {
    // Can't undo if at the beginning or during AI turn or in playback
    if (gameState.historyIndex <= 0 || gameState.isAIThinking || gameState.isPlaybackMode) return;

    // In PvA mode, undo twice to go back to player's last move
    if (gameState.gameMode === 'pva' && gameState.historyIndex >= 2) {
        gameState.historyIndex -= 2;
    } else {
        gameState.historyIndex--;
    }

    const snapshot = gameState.stateHistory[gameState.historyIndex];
    restoreState(snapshot);
}

function redoMove() {
    // Can't redo if at the end or during AI turn or in playback
    if (gameState.historyIndex >= gameState.stateHistory.length - 1 ||
        gameState.isAIThinking || gameState.isPlaybackMode) return;

    // In PvA mode, redo twice to go forward to player's next move
    if (gameState.gameMode === 'pva' && gameState.historyIndex < gameState.stateHistory.length - 2) {
        gameState.historyIndex += 2;
    } else {
        gameState.historyIndex++;
    }

    const snapshot = gameState.stateHistory[gameState.historyIndex];
    restoreState(snapshot);
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    // Disable undo/redo during playback or AI thinking
    if (gameState.isPlaybackMode || gameState.isAIThinking) {
        undoBtn.disabled = true;
        redoBtn.disabled = true;
        return;
    }

    // Undo is enabled if we have history
    undoBtn.disabled = gameState.historyIndex <= 0;

    // Redo is enabled if we're not at the end
    redoBtn.disabled = gameState.historyIndex >= gameState.stateHistory.length - 1;
}

function showGameOver(winner) {
    const winnerText = winner === 'white' ? 'White wins!' :
                      (gameState.gameMode === 'pva' ? 'AI wins!' : 'Black wins!');
    document.getElementById('winner-text').textContent = winnerText;

    // Play win/lose sound
    if (gameState.gameMode === 'pva') {
        // In AI mode, white is player
        playSound(winner === 'white' ? 'win' : 'lose');
    } else {
        // In PvP mode, just play win sound
        playSound('win');
    }

    // Update statistics
    gameState.stats.gamesPlayed++;
    if (gameState.gameMode === 'pva') {
        if (winner === 'white') {
            gameState.stats.wins++;
            gameState.stats.currentStreak++;
            if (gameState.stats.currentStreak > gameState.stats.bestStreak) {
                gameState.stats.bestStreak = gameState.stats.currentStreak;
            }
        } else {
            gameState.stats.losses++;
            gameState.stats.currentStreak = 0;
        }
    }
    saveStats();

    // Save completed game record
    if (gameState.currentGameRecord) {
        gameState.currentGameRecord.winner = winner;
        gameState.currentGameRecord.endTime = new Date().toISOString();
        saveGameRecord(gameState.currentGameRecord);
    }

    document.getElementById('game-over-modal').style.display = 'block';
}

// ==================== LOCAL STORAGE ====================

function saveStats() {
    try {
        localStorage.setItem('myllyStats', JSON.stringify(gameState.stats));
        localStorage.setItem('myllySettings', JSON.stringify({
            soundEnabled: gameState.soundEnabled,
            removeFromHand: gameState.removeFromHand,
            darkTheme: gameState.darkTheme
        }));
    } catch (e) {
        console.error('Failed to save stats:', e);
    }
}

function loadStats() {
    try {
        const savedStats = localStorage.getItem('myllyStats');
        if (savedStats) {
            gameState.stats = JSON.parse(savedStats);
        }

        const savedSettings = localStorage.getItem('myllySettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            gameState.soundEnabled = settings.soundEnabled ?? true;
            gameState.removeFromHand = settings.removeFromHand ?? true;
            gameState.darkTheme = settings.darkTheme ?? false;
        }

        // Load saved games
        const savedGames = localStorage.getItem('myllySavedGames');
        if (savedGames) {
            gameState.savedGames = JSON.parse(savedGames);
        }
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

function saveGameRecord(gameRecord) {
    try {
        // Add to saved games list (keep last 20 games)
        gameState.savedGames.unshift(gameRecord);
        if (gameState.savedGames.length > 20) {
            gameState.savedGames = gameState.savedGames.slice(0, 20);
        }

        localStorage.setItem('myllySavedGames', JSON.stringify(gameState.savedGames));
    } catch (e) {
        console.error('Failed to save game record:', e);
    }
}

// ==================== PLAYBACK FUNCTIONS ====================

function goToMove(index) {
    if (index < 0 || index >= gameState.moveHistory.length) return;

    gameState.isPlaybackMode = true;
    gameState.playbackIndex = index;

    const move = gameState.moveHistory[index];

    // Restore board state
    gameState.board = [...move.boardState];
    gameState.pieceCount.white = move.whitePieces;
    gameState.pieceCount.black = move.blackPieces;

    updateDisplay();
    updateMoveCounter();
}

function previousMove() {
    if (gameState.playbackIndex > 0) {
        goToMove(gameState.playbackIndex - 1);
    }
}

function nextMove() {
    if (gameState.playbackIndex < gameState.moveHistory.length - 1) {
        goToMove(gameState.playbackIndex + 1);
    }
}

function exitPlayback() {
    if (!gameState.isPlaybackMode) return;

    gameState.isPlaybackMode = false;
    gameState.playbackIndex = -1;

    // Restore to latest state
    if (gameState.moveHistory.length > 0) {
        const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
        gameState.board = [...lastMove.boardState];
        gameState.pieceCount.white = lastMove.whitePieces;
        gameState.pieceCount.black = lastMove.blackPieces;
    }

    updateDisplay();
    updateMoveCounter();
}

function updateMoveCounter() {
    const counter = document.getElementById('move-counter');
    if (gameState.isPlaybackMode) {
        counter.textContent = `Move ${gameState.playbackIndex + 1} / ${gameState.moveHistory.length}`;
    } else {
        counter.textContent = `Move ${gameState.moveHistory.length} / ${gameState.moveHistory.length}`;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initGame);
