import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button';

const ROWS = 6;
const COLS = 7;
type Player = '1' | '2';
const DIFFICULTIES = { 'Easy': 0, 'Medium': 1, 'Hard': 2 };
type Difficulty = keyof typeof DIFFICULTIES;

const createEmptyBoard = (): (Player | null)[][] => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

const checkWin = (board: (Player | null)[][]) => {
    // Check horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            if (board[r][c] && board[r][c] === board[r][c+1] && board[r][c] === board[r][c+2] && board[r][c] === board[r][c+3]) {
                return board[r][c];
            }
        }
    }
    // Check vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            if (board[r][c] && board[r][c] === board[r+1][c] && board[r][c] === board[r+2][c] && board[r][c] === board[r+3][c]) {
                return board[r][c];
            }
        }
    }
    // Check diagonal (down-right)
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            if (board[r][c] && board[r][c] === board[r+1][c+1] && board[r][c] === board[r+2][c+2] && board[r][c] === board[r+3][c+3]) {
                return board[r][c];
            }
        }
    }
    // Check diagonal (up-right)
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            if (board[r][c] && board[r][c] === board[r-1][c+1] && board[r][c] === board[r-2][c+2] && board[r][c] === board[r-3][c+3]) {
                return board[r][c];
            }
        }
    }
    return null;
};

const findBestMove = (board: (Player | null)[][], difficulty: Difficulty): number | null => {
    const availableCols = Array.from({length: COLS}, (_, i) => i).filter(c => !board[0][c]);
    if (availableCols.length === 0) return null;

    if (DIFFICULTIES[difficulty] < 1) { // Easy
        return availableCols[Math.floor(Math.random() * availableCols.length)];
    }

    const tryMove = (col: number, player: Player): boolean => {
        let tempBoard = board.map(r => [...r]);
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!tempBoard[r][col]) {
                tempBoard[r][col] = player;
                return !!checkWin(tempBoard);
            }
        }
        return false;
    };
    
    // Check for winning move for AI
    for (const col of availableCols) {
        if (tryMove(col, '2')) return col;
    }
    
    // Check for blocking move for Player
    for (const col of availableCols) {
        if (tryMove(col, '1')) return col;
    }
    
    // Medium: Fallback to random if no immediate win/block
    if(difficulty === 'Medium') {
         return availableCols[Math.floor(Math.random() * availableCols.length)];
    }
    
    // Hard: Prefer center columns
    const centerCols = [3, 2, 4, 1, 5, 0, 6];
    for (const col of centerCols) {
        if (availableCols.includes(col)) return col;
    }

    return availableCols[0];
}

export const ConnectFour: React.FC = () => {
    const [board, setBoard] = useState(createEmptyBoard());
    const [turn, setTurn] = useState<Player>('1');
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');

    const handleColumnClick = useCallback((c: number) => {
        if (winner || board[0][c] || (turn === '2')) return;

        const newBoard = board.map(row => [...row]);
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!newBoard[r][c]) {
                newBoard[r][c] = turn;
                break;
            }
        }

        const newWinner = checkWin(newBoard);
        if (newWinner) {
            setWinner(newWinner);
        } else if (newBoard.flat().every(cell => cell !== null)) {
            setWinner('draw');
        } else {
            setTurn(turn === '1' ? '2' : '1');
        }
        setBoard(newBoard);
    }, [board, turn, winner]);
    
    useEffect(() => {
        if (turn === '2' && !winner) {
            const timeout = setTimeout(() => {
                const bestMove = findBestMove(board, difficulty);
                if (bestMove !== null) {
                    const newBoard = board.map(row => [...row]);
                     for (let r = ROWS - 1; r >= 0; r--) {
                         if (!newBoard[r][bestMove]) {
                             newBoard[r][bestMove] = '2';
                             break;
                         }
                     }
                     const newWinner = checkWin(newBoard);
                     if (newWinner) {
                         setWinner(newWinner);
                     } else if (newBoard.flat().every(cell => cell !== null)) {
                         setWinner('draw');
                     } else {
                         setTurn('1');
                     }
                     setBoard(newBoard);
                }
            }, 500);
            return () => clearTimeout(timeout);
        }
    }, [turn, winner, board, difficulty]);

    const resetGame = () => {
        setBoard(createEmptyBoard());
        setTurn('1');
        setWinner(null);
    };

    let statusMessage = winner
        ? winner === 'draw' ? "It's a draw!" : `Player ${winner === '1' ? 'You' : 'AI'} wins!`
        : `Turn: Player ${turn === '1' ? 'You' : 'AI'}`;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="mb-4 flex flex-wrap justify-center gap-2 items-center">
                <h2 className="text-xl font-bold w-full text-center sm:w-auto">{statusMessage}</h2>
                <div className="flex gap-2">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => 
                        <Button key={d} size="sm" onClick={() => setDifficulty(d)} variant={difficulty === d ? 'primary' : 'secondary'}>{d}</Button>
                    )}
                </div>
                <Button onClick={resetGame} variant="secondary" size="sm">New Game</Button>
            </div>
            <div className="bg-blue-800 p-2 rounded-lg grid grid-cols-7 gap-1">
                {Array.from({ length: ROWS }).map((_, r) =>
                    Array.from({ length: COLS }).map((_, c) => (
                        <div key={`${r}-${c}`} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer" onClick={() => handleColumnClick(c)}>
                           <div className="w-9 h-9 sm:w-11 sm:h-11 bg-background-dark rounded-full">
                             {board[r][c] && <div className={`w-full h-full rounded-full ${board[r][c] === '1' ? 'bg-red-500' : 'bg-yellow-400'}`} />}
                           </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
