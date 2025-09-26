import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button.tsx';

// --- TYPES & CONSTANTS ---
const SIZE = 10;
type Player = '1' | '2';
type Letter = 'S' | 'O';
type CellValue = Letter | null;
type Board = CellValue[][];
type GameState = 'menu' | 'playing' | 'gameOver';
type GameMode = 'pvp' | 'pva';

const createEmptyBoard = (): Board => Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));

// --- SOS Game Logic ---
const checkForSOS = (board: Board, r: number, c: number): { count: number, lines: [number, number][][] } => {
    let count = 0;
    const lines: [number, number][][] = [];
    const placedLetter = board[r][c];

    const dirs = [
        [0, 1], [1, 0], [1, 1], [1, -1],
    ];

    for (const [dr, dc] of dirs) {
        if (placedLetter === 'O') {
            if (board[r - dr]?.[c - dc] === 'S' && board[r + dr]?.[c + dc] === 'S') {
                count++;
                lines.push([ [r - dr, c - dc], [r, c], [r + dr, c + dc] ]);
            }
        } else if (placedLetter === 'S') {
            if (board[r + dr]?.[c + dc] === 'O' && board[r + 2 * dr]?.[c + 2 * dc] === 'S') {
                count++;
                lines.push([ [r, c], [r + dr, c + dc], [r + 2 * dr, c + 2 * dc] ]);
            }
            if (board[r - dr]?.[c - dc] === 'O' && board[r - 2 * dr]?.[c - 2 * dc] === 'S') {
                count++;
                lines.push([ [r - 2 * dr, c - 2 * dc], [r - dr, c - dc], [r, c] ]);
            }
        }
    }
    return { count, lines };
};


// --- The Component ---
export const SosGame: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [gameMode, setGameMode] = useState<GameMode>('pva');
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [turn, setTurn] = useState<Player>('1');
    const [scores, setScores] = useState({ '1': 0, '2': 0 });
    const [player1Letter, setPlayer1Letter] = useState<Letter>('S');
    const [player2Letter, setPlayer2Letter] = useState<Letter>('S');
    const [winner, setWinner] = useState<string | null>(null);
    const [sosLines, setSosLines] = useState<[number, number][][]>([]);


    const resetGame = () => {
        setBoard(createEmptyBoard());
        setTurn('1');
        setScores({ '1': 0, '2': 0 });
        setWinner(null);
        setSosLines([]);
    };

    const handleStartGame = (mode: GameMode) => {
        setGameMode(mode);
        resetGame();
        setGameState('playing');
    };

    const isBoardFull = board.flat().every(cell => cell !== null);

    useEffect(() => {
        if (isBoardFull && !winner) {
            setGameState('gameOver');
            if (scores['1'] > scores['2']) setWinner('Player 1');
            else if (scores['2'] > scores['1']) setWinner(gameMode === 'pva' ? 'AI' : 'Player 2');
            else setWinner('Draw');
        }
    }, [board, scores, winner, isBoardFull, gameMode]);


    const makeMove = useCallback((r: number, c: number, letter: Letter) => {
        if (board[r][c] !== null) return;

        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = letter;
        setBoard(newBoard);

        const { count, lines } = checkForSOS(newBoard, r, c);
        
        if (count > 0) {
            setScores(prev => ({ ...prev, [turn]: prev[turn] + count }));
            setSosLines(prev => [...prev, ...lines]);
        } else {
            setTurn(prev => (prev === '1' ? '2' : '1'));
        }
    }, [board, turn]);

    const handleCellClick = (r: number, c: number) => {
        if (gameState !== 'playing' || winner) return;
        if (gameMode === 'pva' && turn === '2') return;

        const letterToPlace = turn === '1' ? player1Letter : player2Letter;
        makeMove(r, c, letterToPlace);
    };

    useEffect(() => {
        if (gameMode === 'pva' && turn === '2' && !isBoardFull && gameState === 'playing' && !winner) {
            const timeoutId = setTimeout(() => {
                let bestMove: { r: number, c: number, letter: Letter, score: number } | null = null;
                const emptyCells: [number, number][] = [];

                for (let r = 0; r < SIZE; r++) {
                    for (let c = 0; c < SIZE; c++) {
                        if (board[r][c] === null) {
                            emptyCells.push([r, c]);
                            for (const letter of ['S', 'O'] as Letter[]) {
                                let tempBoard = board.map(row => [...row]);
                                tempBoard[r][c] = letter;
                                const { count } = checkForSOS(tempBoard, r, c);
                                if (count > (bestMove?.score ?? -1)) {
                                    bestMove = { r, c, letter, score: count };
                                }
                            }
                        }
                    }
                }

                if (bestMove && bestMove.score > 0) {
                    makeMove(bestMove.r, bestMove.c, bestMove.letter);
                } else {
                    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                    const letter = Math.random() > 0.5 ? 'S' : 'O';
                    makeMove(r, c, letter);
                }
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [turn, board, gameMode, makeMove, isBoardFull, gameState, winner]);

    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                <h2 className="text-3xl font-bold mb-4">SOS Game</h2>
                <p className="text-text-secondary mb-6">Form 'SOS' to score points. The player with the most points wins.</p>
                <div className="flex flex-col gap-4 w-48">
                    <Button onClick={() => handleStartGame('pva')} size="lg">Player vs AI</Button>
                    <Button onClick={() => handleStartGame('pvp')} size="lg">Player vs Player</Button>
                </div>
            </div>
        );
    }

    const isLineCell = (r: number, c: number) => sosLines.some(line => line.some(([lr, lc]) => lr === r && lc === c));

    return (
        <div className="flex flex-col h-full bg-background-dark p-2 sm:p-4 rounded-lg items-center justify-start overflow-y-auto">
             <div className="w-full max-w-md flex justify-between items-center mb-2 flex-shrink-0">
                <div className="text-left">
                    <h2 className="text-xl sm:text-2xl font-bold hidden sm:block">SOS Game</h2>
                    {gameState === 'gameOver' ? (
                         <div className="text-base sm:text-xl font-bold text-brand-secondary">
                             Game Over! {winner} Wins!
                         </div>
                     ) : (
                        <div className="text-sm sm:text-lg">
                            Turn: 
                            <span className={`font-bold ${turn === '1' ? 'text-brand-primary' : 'text-red-500'}`}>
                                {gameMode === 'pva' ? (turn === '1' ? ' You' : ' AI') : ` Player ${turn}`}
                            </span>
                        </div>
                     )}
                </div>
                <div className="flex gap-2 sm:gap-4">
                    <div>
                        <p className="font-bold text-brand-primary text-xs sm:text-base">Player 1</p>
                        <p className="text-lg sm:text-xl font-bold">{scores['1']}</p>
                    </div>
                    <div>
                        <p className="font-bold text-red-500 text-xs sm:text-base">{gameMode === 'pva' ? 'AI' : 'Player 2'}</p>
                        <p className="text-lg sm:text-xl font-bold">{scores['2']}</p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md aspect-square my-2 flex-shrink-0">
                <div className="grid grid-cols-10 gap-px bg-border-color p-px rounded h-full">
                    {board.map((row, r) =>
                        row.map((cell, c) => (
                            <div
                                key={`${r}-${c}`}
                                onClick={() => handleCellClick(r, c)}
                                className={`w-full h-full flex items-center justify-center text-xl font-bold cursor-pointer transition-colors
                                ${isLineCell(r, c) ? 'bg-green-500' : 'bg-surface hover:bg-overlay'}`}
                            >
                                {cell}
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div className="w-full max-w-md flex justify-between items-center mt-2 flex-shrink-0">
                <div>
                    <p className="text-xs sm:text-base mb-1">Place:</p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => (turn === '1' ? setPlayer1Letter('S') : setPlayer2Letter('S'))}
                            variant={(turn === '1' ? player1Letter : player2Letter) === 'S' ? 'primary' : 'secondary'}
                        >S</Button>
                        <Button
                            size="sm"
                            onClick={() => (turn === '1' ? setPlayer1Letter('O') : setPlayer2Letter('O'))}
                            variant={(turn === '1' ? player1Letter : player2Letter) === 'O' ? 'primary' : 'secondary'}
                        >O</Button>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Button onClick={resetGame} variant="secondary" size="sm">New Game</Button>
                    <Button onClick={() => setGameState('menu')} variant="ghost" size="sm">Back to Menu</Button>
                </div>
            </div>

        </div>
    );
};
