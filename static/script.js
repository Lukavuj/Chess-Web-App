// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('chess-board');
    const capturedWhitePieces = document.getElementById('captured-white-pieces');
    const capturedBlackPieces = document.getElementById('captured-black-pieces');
    const turnIndicator = document.getElementById('current-turn');
    const gameTimerDisplay = document.getElementById('game-timer');
    const playDropdown = document.getElementById('play-dropdown');
    const themeDropdown = document.getElementById('theme-dropdown');

    // New variables for controlling visibility
    const turnIndicatorContainer = document.getElementById('turn-indicator');
    const timerContainer = document.getElementById('timer');
    const fallenSoldiersContainer = document.getElementById('fallen-soldiers');
    const pauseButton = document.getElementById('pause-btn');
    const pauseModal = document.getElementById('pause-modal');
    const winnerModal = document.getElementById('winner-modal');
    const winnerMessage = document.getElementById('winner-message');

    // Theme color pickers
    const lightTileColorPicker = document.getElementById('light-tile-color-picker');
    const darkTileColorPicker = document.getElementById('dark-tile-color-picker');

    const labelsTop = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const labelsLeft = ["8", "7", "6", "5", "4", "3", "2", "1"];
    const pieces = {
        1: ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
        2: Array(8).fill("♟"),
        7: Array(8).fill("♙"),
        8: ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"]
    };

    // Game variables
    let selectedPiece = null;
    let currentTurn = 'white';
    let isPaused = false;
    let seconds = 0;
    let timerInterval = null;
    let timerStarted = false;
    let gameEnded = false;
    let gameMode = 'pvp'; // 'pvp' or 'pvc'

    // Initialize the board with tiles only
    function createBoard(withPieces = false) {
        board.innerHTML = "";
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const square = document.createElement('div');
                square.dataset.row = row;
                square.dataset.col = col;

                if (row === 0 && col > 0) {
                    square.textContent = labelsTop[col - 1];
                    square.className = 'label-top';
                } else if (col === 0 && row > 0) {
                    square.textContent = labelsLeft[row - 1];
                    square.className = 'label-left';
                } else if (row > 0 && col > 0) {
                    const isLightSquare = (row + col) % 2 === 0;
                    square.className = `square ${isLightSquare ? 'light' : 'dark'}`;
                    if (withPieces && pieces[row]) {
                        square.textContent = pieces[row][col - 1];
                        square.classList.add(row <= 2 ? 'black-piece' : 'white-piece');
                    }
                    square.addEventListener('click', () => handleSquareClick(square));
                }
                board.appendChild(square);
            }
        }
    }

    // Function to update tile colors
    function updateTileColors() {
        const lightColor = lightTileColorPicker.value;
        const darkColor = darkTileColorPicker.value;
        document.documentElement.style.setProperty('--light-tile-color', lightColor);
        document.documentElement.style.setProperty('--dark-tile-color', darkColor);
    }

    // Event listeners for color pickers
    lightTileColorPicker.addEventListener('input', updateTileColors);
    darkTileColorPicker.addEventListener('input', updateTileColors);

    // Apply initial colors
    updateTileColors();

    // Start timer function
    function startTimer() {
        if (!isPaused) {
            // Show the timer and Fallen Soldiers area when the timer starts
            timerContainer.style.display = 'block';
            fallenSoldiersContainer.style.display = 'block';

            if (!timerStarted) {
                timerStarted = true;
                timerInterval = setInterval(updateTimer, 1000);
            } else {
                clearInterval(timerInterval);
                timerInterval = setInterval(updateTimer, 1000);
            }
        }
    }

    // Update timer function
    function updateTimer() {
        if (!isPaused) {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            gameTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;
        }
    }

    // Pause and resume functionality
    pauseButton.addEventListener('click', function() {
        pauseGame();
    });

    document.getElementById('resume-btn').addEventListener('click', function() {
        resumeGame();
    });

    document.getElementById('quit-btn').addEventListener('click', function() {
        pauseModal.style.display = 'none';
        resetGame();
    });

    function pauseGame() {
        if (!isPaused) {
            isPaused = true;
            clearInterval(timerInterval);
            pauseModal.style.display = 'block';
        }
    }

    function resumeGame() {
        if (isPaused) {
            isPaused = false;
            pauseModal.style.display = 'none';
            startTimer();
        }
    }

    // Play Again button functionality
    document.getElementById('play-again-btn').addEventListener('click', function() {
        winnerModal.style.display = 'none';
        resetGame();
    });

    // Clear timer when game ends
    function resetTimer() {
        clearInterval(timerInterval);
        gameTimerDisplay.textContent = "00:00";
        timerStarted = false;
        timerContainer.style.display = 'none';
        seconds = 0; // Reset the timer count
    }

    // Handle square click for selecting and moving pieces
    function handleSquareClick(square) {
        if (isPaused || gameEnded) return; // Do nothing if the game is paused or ended
        if (gameMode === 'pvc' && currentTurn !== 'white') return; // Ignore clicks when it's the computer's turn

        // If a piece is already selected
        if (selectedPiece) {
            const selectedPieceColor = selectedPiece.classList.contains('white-piece') ? 'white' : 'black';
            const targetPieceColor = square.classList.contains('white-piece') ? 'white' :
                square.classList.contains('black-piece') ? 'black' : null;

            // Cannot move onto a square occupied by own piece
            if (targetPieceColor === selectedPieceColor) {
                // Deselect the piece
                selectedPiece.classList.remove('selected-piece');
                selectedPiece = null;
                return;
            }

            // Check if it's the player's turn
            if (selectedPieceColor === currentTurn) {
                if (isValidMove(selectedPiece, square)) {
                    executeMove(selectedPiece, square);

                    // Switch turns
                    currentTurn = currentTurn === 'white' ? 'black' : 'white';
                    turnIndicator.textContent = currentTurn === 'white' ? "White's Turn" : "Black's Turn";

                    // If playing vs computer and it's the computer's turn, make a move
                    if (gameMode === 'pvc' && currentTurn === 'black') {
                        setTimeout(computerMove, 500); // Delay to simulate thinking
                    }
                }
            }
            // Deselect the piece
            selectedPiece.classList.remove('selected-piece');
            selectedPiece = null;
        } else if (square.textContent) {
            // Select piece if it matches the current player's turn
            const pieceColor = square.classList.contains('white-piece') ? 'white' :
                square.classList.contains('black-piece') ? 'black' : null;
            if (pieceColor === currentTurn) {
                selectedPiece = square;
                selectedPiece.classList.add('selected-piece'); // Highlight the selected piece
            }
        }
    }

    // Function to execute a move
    function executeMove(startSquare, endSquare) {
        const targetPiece = endSquare.textContent;
        const selectedPieceColor = startSquare.classList.contains('white-piece') ? 'white' : 'black';
        const targetPieceColor = endSquare.classList.contains('white-piece') ? 'white' :
            endSquare.classList.contains('black-piece') ? 'black' : null;

        startTimer();

        // Capture opponent's piece if present
        if (targetPiece && targetPieceColor !== selectedPieceColor) {
            capturePiece(targetPiece, targetPieceColor);
        }

        // Move piece to the target square
        endSquare.textContent = startSquare.textContent;
        endSquare.classList.remove('white-piece', 'black-piece');
        endSquare.classList.add(selectedPieceColor + '-piece');

        // Clear the original square
        startSquare.textContent = "";
        startSquare.classList.remove('white-piece', 'black-piece');
    }

    // Capture the piece and display it in the "Fallen Soldiers" area
    function capturePiece(piece, color) {
        const capturedPiece = document.createElement('span');
        capturedPiece.textContent = piece;

        if (color === 'white') {
            // Captured white piece by black
            capturedBlackPieces.appendChild(capturedPiece);
        } else {
            // Captured black piece by white
            capturedWhitePieces.appendChild(capturedPiece);
        }

        // Check if the captured piece is a king
        if (piece === '♔' || piece === '♚') {
            endGame(currentTurn === 'white' ? 'white' : 'black');
        }
    }

    // Check if a move is valid based on piece type and destination
    function isValidMove(startSquare, endSquare) {
        const piece = startSquare.textContent;
        const startRow = parseInt(startSquare.dataset.row);
        const startCol = parseInt(startSquare.dataset.col);
        const endRow = parseInt(endSquare.dataset.row);
        const endCol = parseInt(endSquare.dataset.col);
        const rowDiff = Math.abs(endRow - startRow);
        const colDiff = Math.abs(endCol - startCol);

        const isWhite = startSquare.classList.contains('white-piece');
        const direction = isWhite ? -1 : 1;
        const opponentClass = isWhite ? 'black-piece' : 'white-piece';

        const targetPieceColor = endSquare.classList.contains('white-piece') ? 'white' :
            endSquare.classList.contains('black-piece') ? 'black' : null;

        // Prevent moving onto own piece
        if (targetPieceColor === (isWhite ? 'white' : 'black')) {
            return false; // Can't move onto a square occupied by own piece
        }

        switch (piece) {
            case '♙': // White pawn
            case '♟': // Black pawn
                // Single step forward
                if (endRow === startRow + direction && startCol === endCol && !endSquare.textContent) {
                    return true;
                }
                // Double step from starting position
                if ((startRow === (isWhite ? 7 : 2) && endRow === startRow + 2 * direction && startCol === endCol && !endSquare.textContent)) {
                    return true;
                }
                // Capture diagonally
                if (endRow === startRow + direction && colDiff === 1 && endSquare.classList.contains(opponentClass)) {
                    return true;
                }
                break;
            case '♖': case '♜': // Rook
                if ((rowDiff === 0 || colDiff === 0) && isPathClear(startRow, startCol, endRow, endCol)) {
                    return true;
                }
                break;
            case '♘': case '♞': // Knight
                if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                    return true;
                }
                break;
            case '♗': case '♝': // Bishop
                if (rowDiff === colDiff && isPathClear(startRow, startCol, endRow, endCol)) {
                    return true;
                }
                break;
            case '♕': case '♛': // Queen
                if ((rowDiff === colDiff || rowDiff === 0 || colDiff === 0) && isPathClear(startRow, startCol, endRow, endCol)) {
                    return true;
                }
                break;
            case '♔': case '♚': // King
                if (rowDiff <= 1 && colDiff <= 1) {
                    return true;
                }
                break;
        }
        return false;
    }

    // Check if the path between two squares is clear (no pieces blocking)
    function isPathClear(startRow, startCol, endRow, endCol) {
        let rowDirection = endRow - startRow === 0 ? 0 : (endRow - startRow) / Math.abs(endRow - startRow);
        let colDirection = endCol - startCol === 0 ? 0 : (endCol - startCol) / Math.abs(endCol - startCol);

        let currentRow = startRow + rowDirection;
        let currentCol = startCol + colDirection;

        while (currentRow !== endRow || currentCol !== endCol) {
            const square = document.querySelector(`[data-row='${currentRow}'][data-col='${currentCol}']`);
            if (square && square.textContent) {
                return false; // Path is blocked
            }
            if (currentRow !== endRow) currentRow += rowDirection;
            if (currentCol !== endCol) currentCol += colDirection;
        }
        return true; // Path is clear
    }

    // Function to end the game
    function endGame(winner) {
        // Stop the timer
        clearInterval(timerInterval);

        // Set the game ended flag
        gameEnded = true;

        // Display the winner modal
        winnerMessage.textContent = `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins! Game over.`;
        winnerModal.style.display = 'block';
    }

    // Function to reset the game
    function resetGame() {
        // Clear the board and reset variables
        createBoard(false);
        resetTimer();
        currentTurn = 'white';
        turnIndicator.textContent = "White's Turn";
        capturedWhitePieces.innerHTML = "";
        capturedBlackPieces.innerHTML = "";
        selectedPiece = null;
        timerStarted = false;
        isPaused = false;
        gameEnded = false;

        // Hide game info and fallen soldiers
        turnIndicatorContainer.style.display = 'none';
        timerContainer.style.display = 'none';
        fallenSoldiersContainer.style.display = 'none';
        pauseButton.style.display = 'none';
    }

    // Game Start and UI Controls
    function startGame(mode) {
        gameMode = mode; // Set the game mode
        resetGame(); // Reset the game state
        createBoard(true); // Create the board with pieces
        turnIndicatorContainer.style.display = 'block';
        pauseButton.style.display = 'block';

        // If the computer plays as black and it's black's turn, make the first move
        if (gameMode === 'pvc' && currentTurn === 'black') {
            setTimeout(computerMove, 500); // Delay to simulate thinking
        }
    }

    document.getElementById('create-game').addEventListener('click', function() {
        startGame('pvp'); // Start a Player vs Player game
    });

    document.getElementById('vs-computer').addEventListener('click', function() {
        startGame('pvc'); // Start a Player vs Computer game
    });

    // Toggle theme dropdown visibility
    document.getElementById('theme-btn').addEventListener('click', function() {
        themeDropdown.style.display = themeDropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Toggle play dropdown visibility
    document.getElementById('play-btn').addEventListener('click', function() {
        playDropdown.style.display = playDropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdowns if clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('#play-nav') && playDropdown.style.display === 'block') {
            playDropdown.style.display = 'none';
        }
        if (!event.target.closest('#theme-nav') && themeDropdown.style.display === 'block') {
            themeDropdown.style.display = 'none';
        }
    });

    // Computer move function
    function computerMove() {
        if (isPaused || gameEnded) return; // Do nothing if the game is paused or ended

        // Get all computer's pieces
        const allSquares = document.querySelectorAll('.square');
        const computerPieces = Array.from(allSquares).filter(square =>
            square.classList.contains(currentTurn + '-piece')
        );

        // Generate all possible valid moves
        const validMoves = [];

        computerPieces.forEach(piece => {
            const startSquare = piece;

            allSquares.forEach(square => {
                const endSquare = square;

                // Only consider moves where the target square is empty or occupied by an opponent's piece
                const targetPieceColor = endSquare.classList.contains('white-piece') ? 'white' :
                    endSquare.classList.contains('black-piece') ? 'black' : null;

                if (targetPieceColor !== currentTurn && isValidMove(startSquare, endSquare)) {
                    validMoves.push({
                        piece: startSquare,
                        target: endSquare
                    });
                }
            });
        });

        if (validMoves.length === 0) {
            // No valid moves available, the player wins
            endGame(currentTurn === 'white' ? 'black' : 'white');
            return;
        }

        // Select a random move
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

        // Execute the move
        executeMove(randomMove.piece, randomMove.target);

        // Switch turns back to the player
        currentTurn = currentTurn === 'white' ? 'black' : 'white';
        turnIndicator.textContent = currentTurn === 'white' ? "White's Turn" : "Black's Turn";
    }

    // Initialize the board without pieces
    createBoard(false);
});
