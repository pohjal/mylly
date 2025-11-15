// Connect Four Game State
const c4State = {
    board: Array(6).fill(null).map(() => Array(7).fill(null)),
    currentPlayer: 'red',
    gameOver: false,
    winner: null,
    vsAI: false,
    aiDifficulty: 'hard',
    aiThinking: false
};

const ROWS = 6;
const COLS = 7;

// Initialize Connect Four
function initConnect4() {
    createBoard();

    document.getElementById('c4-reset-btn').addEventListener('click', showC4GameModeModal);
    document.getElementById('c4-new-game-btn').addEventListener('click', showC4GameModeModal);
    document.getElementById('c4-rules-btn').addEventListener('click', showC4Rules);
    document.getElementById('c4-close-rules').addEventListener('click', hideC4Rules);

    // Game mode selection
    document.getElementById('c4-pvp-btn').addEventListener('click', () => startC4Game(false));
    document.getElementById('c4-pva-btn').addEventListener('click', () => {
        document.getElementById('c4-difficulty-select').style.display = 'block';
    });

    // Difficulty selection
    document.querySelectorAll('.c4-difficulty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.c4-difficulty-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            c4State.aiDifficulty = this.dataset.difficulty;
            startC4Game(true);
        });
    });

    window.addEventListener('click', (e) => {
        const rulesModal = document.getElementById('c4-rules-modal');
        if (e.target === rulesModal) {
            hideC4Rules();
        }
    });
}

function createBoard() {
    const boardEl = document.getElementById('connect4-board');
    boardEl.innerHTML = '';

    for (let col = 0; col < COLS; col++) {
        const column = document.createElement('div');
        column.className = 'c4-column';
        column.dataset.col = col;
        column.addEventListener('click', () => handleColumnClick(col));

        for (let row = 0; row < ROWS; row++) {
            const cell = document.createElement('div');
            cell.className = 'c4-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            column.appendChild(cell);
        }

        boardEl.appendChild(column);
    }
}

function handleColumnClick(col) {
    if (c4State.gameOver || c4State.aiThinking) return;
    if (c4State.vsAI && c4State.currentPlayer === 'yellow') return; // AI's turn

    makeC4Move(col);
}

function makeC4Move(col) {
    // Find the lowest empty row in this column
    let row = -1;
    for (let r = 0; r < ROWS; r++) {
        if (c4State.board[r][col] === null) {
            row = r;
            break;
        }
    }

    if (row === -1) return; // Column is full

    // Place piece
    c4State.board[row][col] = c4State.currentPlayer;

    // Update visual
    const cell = document.querySelector(`.c4-cell[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add(c4State.currentPlayer);
    cell.classList.add('dropping');

    setTimeout(() => cell.classList.remove('dropping'), 500);

    // Check for win
    if (checkWin(row, col)) {
        c4State.gameOver = true;
        c4State.winner = c4State.currentPlayer;
        highlightWinningCells(row, col);
        setTimeout(() => showC4GameOver(c4State.currentPlayer), 600);
        return;
    }

    // Check for draw
    if (checkDraw()) {
        c4State.gameOver = true;
        setTimeout(() => showC4GameOver(null), 600);
        return;
    }

    // Switch player
    c4State.currentPlayer = c4State.currentPlayer === 'red' ? 'yellow' : 'red';
    updateC4Display();

    // AI's turn
    if (c4State.vsAI && c4State.currentPlayer === 'yellow' && !c4State.gameOver) {
        c4State.aiThinking = true;
        setTimeout(() => {
            makeAIMove();
            c4State.aiThinking = false;
        }, 800);
    }
}

function checkWin(row, col) {
    const player = c4State.board[row][col];

    // Check horizontal
    if (checkDirection(row, col, 0, 1, player) + checkDirection(row, col, 0, -1, player) >= 3) return true;

    // Check vertical
    if (checkDirection(row, col, 1, 0, player) + checkDirection(row, col, -1, 0, player) >= 3) return true;

    // Check diagonal /
    if (checkDirection(row, col, 1, 1, player) + checkDirection(row, col, -1, -1, player) >= 3) return true;

    // Check diagonal \
    if (checkDirection(row, col, 1, -1, player) + checkDirection(row, col, -1, 1, player) >= 3) return true;

    return false;
}

function checkDirection(row, col, dRow, dCol, player) {
    let count = 0;
    let r = row + dRow;
    let c = col + dCol;

    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && c4State.board[r][c] === player) {
        count++;
        r += dRow;
        c += dCol;
    }

    return count;
}

function highlightWinningCells(row, col) {
    const player = c4State.board[row][col];
    const directions = [
        [0, 1], [0, -1],  // horizontal
        [1, 0], [-1, 0],  // vertical
        [1, 1], [-1, -1], // diagonal /
        [1, -1], [-1, 1]  // diagonal \
    ];

    for (let i = 0; i < directions.length; i += 2) {
        const [dr1, dc1] = directions[i];
        const [dr2, dc2] = directions[i + 1];

        const count1 = checkDirection(row, col, dr1, dc1, player);
        const count2 = checkDirection(row, col, dr2, dc2, player);

        if (count1 + count2 >= 3) {
            // Highlight this line
            highlightCell(row, col);

            for (let j = 1; j <= count1; j++) {
                highlightCell(row + dr1 * j, col + dc1 * j);
            }

            for (let j = 1; j <= count2; j++) {
                highlightCell(row + dr2 * j, col + dc2 * j);
            }

            break;
        }
    }
}

function highlightCell(row, col) {
    const cell = document.querySelector(`.c4-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.classList.add('winning');
    }
}

function checkDraw() {
    for (let col = 0; col < COLS; col++) {
        if (c4State.board[ROWS - 1][col] === null) {
            return false;
        }
    }
    return true;
}

function updateC4Display() {
    // Update player indicators
    document.getElementById('c4-player1-info').classList.toggle('active', c4State.currentPlayer === 'red');
    document.getElementById('c4-player2-info').classList.toggle('active', c4State.currentPlayer === 'yellow');

    // Update turn display
    const turnText = c4State.currentPlayer === 'red' ? 'Red' : 'Yellow';
    document.getElementById('c4-current-turn').textContent = turnText;
}

// AI Functions
function makeAIMove() {
    const depth = c4State.aiDifficulty === 'easy' ? 3 : c4State.aiDifficulty === 'medium' ? 5 : 7;
    const bestMove = findBestMove(depth);

    if (bestMove !== -1) {
        makeC4Move(bestMove);
    }
}

function findBestMove(depth) {
    let bestScore = -Infinity;
    let bestCol = -1;
    const alpha = -Infinity;
    const beta = Infinity;

    // Get valid columns
    const validCols = [];
    for (let col = 0; col < COLS; col++) {
        if (c4State.board[ROWS - 1][col] === null) {
            validCols.push(col);
        }
    }

    // Add some randomness for easier difficulties
    if (c4State.aiDifficulty === 'easy' && Math.random() < 0.3) {
        return validCols[Math.floor(Math.random() * validCols.length)];
    }

    for (let col of validCols) {
        const row = getLowestEmptyRow(col);
        if (row === -1) continue;

        // Make move
        c4State.board[row][col] = 'yellow';

        // Evaluate
        const score = minimax(depth - 1, alpha, beta, false);

        // Undo move
        c4State.board[row][col] = null;

        if (score > bestScore) {
            bestScore = score;
            bestCol = col;
        }
    }

    return bestCol;
}

function minimax(depth, alpha, beta, isMaximizing) {
    // Check terminal states
    const winner = checkWinner();
    if (winner === 'yellow') return 10000;
    if (winner === 'red') return -10000;
    if (isBoardFull()) return 0;
    if (depth === 0) return evaluateBoard();

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;

            c4State.board[row][col] = 'yellow';
            const score = minimax(depth - 1, alpha, beta, false);
            c4State.board[row][col] = null;

            maxScore = Math.max(maxScore, score);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break; // Beta cutoff
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let col = 0; col < COLS; col++) {
            const row = getLowestEmptyRow(col);
            if (row === -1) continue;

            c4State.board[row][col] = 'red';
            const score = minimax(depth - 1, alpha, beta, true);
            c4State.board[row][col] = null;

            minScore = Math.min(minScore, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break; // Alpha cutoff
        }
        return minScore;
    }
}

function evaluateBoard() {
    let score = 0;

    // Center column preference
    const centerCol = Math.floor(COLS / 2);
    for (let row = 0; row < ROWS; row++) {
        if (c4State.board[row][centerCol] === 'yellow') score += 3;
        if (c4State.board[row][centerCol] === 'red') score -= 3;
    }

    // Evaluate all possible windows of 4
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            // Horizontal
            if (col <= COLS - 4) {
                score += evaluateWindow([
                    c4State.board[row][col],
                    c4State.board[row][col + 1],
                    c4State.board[row][col + 2],
                    c4State.board[row][col + 3]
                ]);
            }

            // Vertical
            if (row <= ROWS - 4) {
                score += evaluateWindow([
                    c4State.board[row][col],
                    c4State.board[row + 1][col],
                    c4State.board[row + 2][col],
                    c4State.board[row + 3][col]
                ]);
            }

            // Diagonal /
            if (row <= ROWS - 4 && col <= COLS - 4) {
                score += evaluateWindow([
                    c4State.board[row][col],
                    c4State.board[row + 1][col + 1],
                    c4State.board[row + 2][col + 2],
                    c4State.board[row + 3][col + 3]
                ]);
            }

            // Diagonal \
            if (row >= 3 && col <= COLS - 4) {
                score += evaluateWindow([
                    c4State.board[row][col],
                    c4State.board[row - 1][col + 1],
                    c4State.board[row - 2][col + 2],
                    c4State.board[row - 3][col + 3]
                ]);
            }
        }
    }

    return score;
}

function evaluateWindow(window) {
    let score = 0;
    const aiCount = window.filter(cell => cell === 'yellow').length;
    const playerCount = window.filter(cell => cell === 'red').length;
    const emptyCount = window.filter(cell => cell === null).length;

    // AI advantage
    if (aiCount === 4) score += 100;
    else if (aiCount === 3 && emptyCount === 1) score += 5;
    else if (aiCount === 2 && emptyCount === 2) score += 2;

    // Player threat
    if (playerCount === 3 && emptyCount === 1) score -= 8;
    else if (playerCount === 2 && emptyCount === 2) score -= 1;

    return score;
}

function checkWinner() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (c4State.board[row][col] === null) continue;

            const player = c4State.board[row][col];

            // Check horizontal
            if (col <= COLS - 4) {
                if (c4State.board[row][col] === player &&
                    c4State.board[row][col + 1] === player &&
                    c4State.board[row][col + 2] === player &&
                    c4State.board[row][col + 3] === player) {
                    return player;
                }
            }

            // Check vertical
            if (row <= ROWS - 4) {
                if (c4State.board[row][col] === player &&
                    c4State.board[row + 1][col] === player &&
                    c4State.board[row + 2][col] === player &&
                    c4State.board[row + 3][col] === player) {
                    return player;
                }
            }

            // Check diagonal /
            if (row <= ROWS - 4 && col <= COLS - 4) {
                if (c4State.board[row][col] === player &&
                    c4State.board[row + 1][col + 1] === player &&
                    c4State.board[row + 2][col + 2] === player &&
                    c4State.board[row + 3][col + 3] === player) {
                    return player;
                }
            }

            // Check diagonal \
            if (row >= 3 && col <= COLS - 4) {
                if (c4State.board[row][col] === player &&
                    c4State.board[row - 1][col + 1] === player &&
                    c4State.board[row - 2][col + 2] === player &&
                    c4State.board[row - 3][col + 3] === player) {
                    return player;
                }
            }
        }
    }
    return null;
}

function getLowestEmptyRow(col) {
    for (let row = 0; row < ROWS; row++) {
        if (c4State.board[row][col] === null) {
            return row;
        }
    }
    return -1;
}

function isBoardFull() {
    for (let col = 0; col < COLS; col++) {
        if (c4State.board[ROWS - 1][col] === null) {
            return false;
        }
    }
    return true;
}

function resetConnect4() {
    c4State.board = Array(6).fill(null).map(() => Array(7).fill(null));
    c4State.currentPlayer = 'red';
    c4State.gameOver = false;
    c4State.winner = null;

    createBoard();
    updateC4Display();
    document.getElementById('c4-game-over-modal').style.display = 'none';
}

function showC4GameOver(winner) {
    let winnerText;
    if (winner === null) {
        winnerText = "It's a draw!";
    } else {
        winnerText = (winner === 'red' ? 'Red' : 'Yellow') + ' wins!';
    }

    document.getElementById('c4-winner-text').textContent = winnerText;
    document.getElementById('c4-game-over-modal').style.display = 'block';
}

function showC4Rules() {
    document.getElementById('c4-rules-modal').style.display = 'block';
}

function hideC4Rules() {
    document.getElementById('c4-rules-modal').style.display = 'none';
}

function showC4GameModeModal() {
    document.getElementById('c4-game-mode-modal').style.display = 'block';
    document.getElementById('c4-difficulty-select').style.display = 'none';
    document.getElementById('c4-game-over-modal').style.display = 'none';
}

function startC4Game(vsAI) {
    c4State.vsAI = vsAI;
    c4State.board = Array(6).fill(null).map(() => Array(7).fill(null));
    c4State.currentPlayer = 'red';
    c4State.gameOver = false;
    c4State.winner = null;
    c4State.aiThinking = false;

    // Update player labels
    if (vsAI) {
        document.getElementById('c4-player1-label').textContent = 'You (Red)';
        document.getElementById('c4-player2-label').textContent = 'AI (Yellow)';
    } else {
        document.getElementById('c4-player1-label').textContent = 'Red Player';
        document.getElementById('c4-player2-label').textContent = 'Yellow Player';
    }

    createBoard();
    updateC4Display();
    document.getElementById('c4-game-mode-modal').style.display = 'none';
}

// Game switching
function switchGame(game) {
    const myllyGame = document.getElementById('mylly-game');
    const connect4Game = document.getElementById('connect4-game');
    const myllyBtn = document.getElementById('mylly-btn');
    const connect4Btn = document.getElementById('connect4-btn');

    if (game === 'mylly') {
        myllyGame.style.display = 'block';
        connect4Game.style.display = 'none';
        myllyBtn.classList.add('active');
        connect4Btn.classList.remove('active');
    } else {
        myllyGame.style.display = 'none';
        connect4Game.style.display = 'block';
        myllyBtn.classList.remove('active');
        connect4Btn.classList.add('active');

        // Show game mode selection when switching to Connect Four
        if (!c4State.vsAI && c4State.currentPlayer === 'red' &&
            c4State.board.every(row => row.every(cell => cell === null))) {
            showC4GameModeModal();
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initConnect4();

    document.getElementById('mylly-btn').addEventListener('click', () => switchGame('mylly'));
    document.getElementById('connect4-btn').addEventListener('click', () => switchGame('connect4'));
});
