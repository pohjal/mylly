// Connect Four Game State
const c4State = {
    board: Array(6).fill(null).map(() => Array(7).fill(null)),
    currentPlayer: 'red',
    gameOver: false,
    winner: null
};

const ROWS = 6;
const COLS = 7;

// Initialize Connect Four
function initConnect4() {
    createBoard();

    document.getElementById('c4-reset-btn').addEventListener('click', resetConnect4);
    document.getElementById('c4-new-game-btn').addEventListener('click', resetConnect4);
    document.getElementById('c4-rules-btn').addEventListener('click', showC4Rules);
    document.getElementById('c4-close-rules').addEventListener('click', hideC4Rules);

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
    if (c4State.gameOver) return;

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
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initConnect4();

    document.getElementById('mylly-btn').addEventListener('click', () => switchGame('mylly'));
    document.getElementById('connect4-btn').addEventListener('click', () => switchGame('connect4'));
});
