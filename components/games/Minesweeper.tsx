import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button.tsx';

type Cell = {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
};
type Board = Cell[][];
type GameStatus = 'playing' | 'won' | 'lost';
type InteractionMode = 'reveal' | 'flag';
type GameState = 'menu' | 'playing';

const DIFFICULTIES = {
    'Easy': { dims: 8, mines: 10 },
    'Medium': { dims: 10, mines: 15 },
    'Hard': { dims: 12, mines: 25 },
};
type Difficulty = keyof typeof DIFFICULTIES;

export const Minesweeper: React.FC = () => {
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [dims, setDims] = useState(DIFFICULTIES.Medium.dims);
    const [mines, setMines] = useState(DIFFICULTIES.Medium.mines);
    const [board, setBoard] = useState<Board>([]);
    const [status, setStatus] = useState<GameStatus>('playing');
    const [firstClick, setFirstClick] = useState(true);
    const [interactionMode, setInteractionMode] = useState<InteractionMode>('reveal');
    const [gameState, setGameState] = useState<GameState>('menu');
    
    const createEmptyBoard = useCallback((): Board => Array(dims).fill(null).map(() => Array(dims).fill(null).map(() => ({
        isMine: false, isRevealed: false, isFlagged: false, adjacentMines: 0
    }))), [dims]);

    const resetGame = useCallback(() => {
        setBoard(createEmptyBoard());
        setStatus('playing');
        setFirstClick(true);
        setInteractionMode('reveal');
    }, [createEmptyBoard]);

    useEffect(() => {
        const newSettings = DIFFICULTIES[difficulty];
        setDims(newSettings.dims);
        setMines(newSettings.mines);
    }, [difficulty]);

    useEffect(() => {
        if (gameState === 'playing') {
            resetGame();
        }
    }, [dims, mines, resetGame, gameState]);

    const generateBoard = (firstRow: number, firstCol: number) => {
        let newBoard = createEmptyBoard();
        let minesPlaced = 0;
        while (minesPlaced < mines) {
            const row = Math.floor(Math.random() * dims);
            const col = Math.floor(Math.random() * dims);
            if (!newBoard[row][col].isMine && (Math.abs(row - firstRow) > 1 || Math.abs(col - firstCol) > 1)) {
                newBoard[row][col].isMine = true;
                minesPlaced++;
            }
        }

        for (let r = 0; r < dims; r++) {
            for (let c = 0; c < dims; c++) {
                if (newBoard[r][c].isMine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < dims && nc >= 0 && nc < dims && newBoard[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                newBoard[r][c].adjacentMines = count;
            }
        }
        return newBoard;
    };

    const revealCell = (r: number, c: number, currentBoard: Board): Board => {
        const newBoard = currentBoard.map(row => row.map(cell => ({...cell})));
        const reveal = (r_in: number, c_in: number) => {
            if (r_in < 0 || r_in >= dims || c_in < 0 || c_in >= dims || newBoard[r_in][c_in].isRevealed || newBoard[r_in][c_in].isFlagged) {
                return;
            }
            newBoard[r_in][c_in].isRevealed = true;
            if (newBoard[r_in][c_in].adjacentMines === 0) {
                 for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        reveal(r_in + dr, c_in + dc);
                    }
                }
            }
        }
        
        if (newBoard[r][c].isFlagged) return newBoard;
        if (newBoard[r][c].isMine) {
             setStatus('lost');
             // Reveal all mines on loss
             return newBoard.map(row => row.map(cell => cell.isMine ? {...cell, isRevealed: true} : cell));
        }
        
        reveal(r, c);
        return newBoard;
    };

    const handleCellClick = (r: number, c: number) => {
        if (status !== 'playing' || board[r][c].isRevealed) return;

        if (interactionMode === 'flag') {
            const newBoard = board.map(row => [...row]);
            newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
            setBoard(newBoard);
            return;
        }

        if (board[r][c].isFlagged) return; // Cannot reveal flagged cell in reveal mode

        let currentBoard = board;
        if (firstClick) {
            currentBoard = generateBoard(r, c);
            setFirstClick(false);
        }
        const newBoard = revealCell(r, c, currentBoard);
        setBoard(newBoard);
    };

    const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
        e.preventDefault();
        if (status !== 'playing' || board[r][c].isRevealed) return;
        const newBoard = board.map(row => [...row]);
        newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
        setBoard(newBoard);
    };
    
    useEffect(() => {
        if (status === 'playing' && board.length > 0) {
            const nonMineCells = dims * dims - mines;
            const revealedCount = board.flat().filter(cell => cell.isRevealed && !cell.isMine).length;
            if (revealedCount === nonMineCells) {
                setStatus('won');
            }
        }
    }, [board, status, dims, mines]);

    const getCellContent = (cell: Cell) => {
        if (status === 'lost' && cell.isMine) return '💣';
        if (cell.isFlagged) return '🚩';
        if (!cell.isRevealed) return '';
        if (cell.isMine) return '💣';
        if (cell.adjacentMines > 0) return cell.adjacentMines;
        return '';
    };

    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Minesweeper</h2>
                    <p className="text-text-secondary mb-6">Select a difficulty to begin.</p>
                    <div className="flex gap-2 mb-6 justify-center">
                        {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                            <Button key={d} size="md" onClick={() => setDifficulty(d)} variant={difficulty === d ? 'primary' : 'secondary'}>{d}</Button>
                        )}
                    </div>
                    <Button onClick={() => setGameState('playing')} size="lg">Start Game</Button>
                </div>
            </div>
        );
    }

    let statusMessage = "Minesweeper";
    if (status === 'won') statusMessage = "You Won! 🎉";
    if (status === 'lost') statusMessage = "Game Over 💣";

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="mb-4 flex flex-wrap justify-center gap-2 items-center">
                <h2 className="text-xl font-bold w-full text-center sm:w-auto">{statusMessage}</h2>
                <div className="flex gap-2">
                     <Button onClick={() => setGameState('menu')} variant="secondary" size="sm">Menu</Button>
                </div>
                <Button onClick={() => setInteractionMode(m => m === 'reveal' ? 'flag' : 'reveal')} size="sm" variant={interactionMode === 'flag' ? 'primary' : 'secondary'}>
                    {interactionMode === 'flag' ? '🚩' : '⛏️'}<span className="hidden sm:inline ml-2">{interactionMode === 'flag' ? 'Flag' : 'Reveal'}</span>
                </Button>
                <Button onClick={resetGame} variant="secondary" size="sm">New Game</Button>
            </div>
            <div className="bg-background-darkest p-2 rounded-lg shadow-inner">
                {board.map((row, r) => (
                    <div key={r} className="flex">
                        {row.map((cell, c) => (
                            <div
                                key={c}
                                onClick={() => handleCellClick(r, c)}
                                onContextMenu={(e) => handleRightClick(e, r, c)}
                                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-base sm:text-lg border border-border-color"
                                style={{
                                    backgroundColor: cell.isRevealed ? 'var(--surface)' : 'var(--overlay)',
                                    cursor: status === 'playing' && !cell.isRevealed ? (interactionMode === 'flag' ? 'cell' : 'pointer') : 'default',
                                    color: ['#3B82F6', '#22C55E', '#EF4444', '#A855F7', '#EAB308'][cell.adjacentMines-1] || 'inherit'
                                }}
                            >
                                {getCellContent(cell)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};