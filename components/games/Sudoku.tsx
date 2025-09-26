import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';

// Basic Sudoku logic (a full generator is complex, so we'll use a pre-solved board and create puzzles)
const SOLVED_BOARD = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
];
const DIFFICULTIES = { 'Easy': 35, 'Medium': 45, 'Hard': 55 };

const createPuzzle = (difficulty: keyof typeof DIFFICULTIES): (number | null)[][] => {
    const puzzle = SOLVED_BOARD.map(row => [...row]);
    let removed = 0;
    while (removed < DIFFICULTIES[difficulty]) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== null) {
            puzzle[r][c] = null;
            removed++;
        }
    }
    return puzzle;
};

export const Sudoku: React.FC = () => {
    const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTIES>('Medium');
    const [puzzle, setPuzzle] = useState<(number | null)[][]>([]);
    const [board, setBoard] = useState<(number | null)[][]>([]);
    const [errors, setErrors] = useState<boolean[][]>([]);
    const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');

    const newGame = () => {
        const newPuzzle = createPuzzle(difficulty);
        setPuzzle(newPuzzle);
        setBoard(newPuzzle.map(row => [...row]));
        setErrors(Array(9).fill(null).map(() => Array(9).fill(false)));
    };
    
    const handleStartGame = () => {
        newGame();
        setGameState('playing');
    }

    const handleInputChange = (r: number, c: number, val: string) => {
        const num = val === '' ? null : parseInt(val, 10);
        if (num !== null && (isNaN(num) || num < 1 || num > 9)) return;

        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = num;
        setBoard(newBoard);
        checkErrors(newBoard);
    };
    
    const checkErrors = (currentBoard: (number|null)[][]) => {
        const newErrors = Array(9).fill(null).map(() => Array(9).fill(false));
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (currentBoard[r][c] === null) continue;
                // Check row/col
                for (let i = 0; i < 9; i++) {
                    if (i !== c && currentBoard[r][i] === currentBoard[r][c]) newErrors[r][c] = true;
                    if (i !== r && currentBoard[i][c] === currentBoard[r][c]) newErrors[r][c] = true;
                }
                // Check 3x3 box
                const boxRow = Math.floor(r / 3) * 3;
                const boxCol = Math.floor(c / 3) * 3;
                for (let br = 0; br < 3; br++) {
                    for (let bc = 0; bc < 3; bc++) {
                         if ((boxRow+br !== r || boxCol+bc !== c) && currentBoard[boxRow+br][boxCol+bc] === currentBoard[r][c]) {
                            newErrors[r][c] = true;
                         }
                    }
                }
            }
        }
        setErrors(newErrors);
    };
    
    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Sudoku</h2>
                    <p className="text-text-secondary mb-6">Select a difficulty to begin.</p>
                    <div className="flex gap-2 mb-6 justify-center">
                        {Object.keys(DIFFICULTIES).map(d => (
                            <Button key={d} size="md" variant={difficulty === d ? 'primary' : 'secondary'} onClick={() => setDifficulty(d as keyof typeof DIFFICULTIES)}>{d}</Button>
                        ))}
                    </div>
                    <Button onClick={handleStartGame} size="lg">Start Game</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="mb-4 flex gap-4 items-center">
                <h2 className="text-xl font-bold">Sudoku</h2>
                 <Button onClick={() => setGameState('menu')} size="sm" variant="secondary">Menu</Button>
                <Button onClick={newGame} size="sm" variant="secondary">New Game</Button>
            </div>
            <div className="grid grid-cols-9 bg-border-color border-2 border-border-color">
                {board.map((row, r) => row.map((cell, c) => (
                    <div key={`${r}-${c}`} className={`w-10 h-10 sm:w-12 sm:h-12 bg-surface text-2xl
                        ${c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-border-color' : ''}
                        ${r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-border-color' : ''}
                    `}>
                        {puzzle[r][c] !== null ? (
                            <div className="w-full h-full flex items-center justify-center font-bold">{cell}</div>
                        ) : (
                            <input
                                type="number"
                                value={cell || ''}
                                onChange={(e) => handleInputChange(r, c, e.target.value)}
                                className={`w-full h-full bg-transparent text-center focus:outline-none focus:bg-overlay
                                ${errors[r][c] ? 'text-danger' : 'text-brand-primary'}
                                `}
                            />
                        )}
                    </div>
                )))}
            </div>
        </div>
    );
};