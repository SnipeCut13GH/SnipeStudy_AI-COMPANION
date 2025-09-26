import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';

type GameMode = 'pvp' | 'pva';
type GameState = 'menu' | 'playing';

const calculateWinner = (squares: (string | null)[]): { winner: string | null, line: number[] | null } => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return { winner: squares[a], line: lines[i] };
        }
    }
    return { winner: null, line: null };
};

const minimax = (newSquares: (string | null)[], player: 'X' | 'O'): { score: number, index?: number } => {
    const availableSpots = newSquares.map((s, i) => s === null ? i : null).filter(i => i !== null) as number[];

    const { winner } = calculateWinner(newSquares);
    if (winner === 'X') return { score: -10 };
    if (winner === 'O') return { score: 10 };
    if (availableSpots.length === 0) return { score: 0 };

    const moves: { index: number, score: number }[] = [];
    for (let i = 0; i < availableSpots.length; i++) {
        const index = availableSpots[i];
        const move: { index: number, score: number } = { index, score: 0 };
        newSquares[index] = player;

        if (player === 'O') {
            const result = minimax(newSquares, 'X');
            move.score = result.score;
        } else {
            const result = minimax(newSquares, 'O');
            move.score = result.score;
        }
        newSquares[index] = null;
        moves.push(move);
    }

    let bestMove: number = -1;
    let bestScore = player === 'O' ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {
        if (player === 'O') {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        } else {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }

    return moves[bestMove];
}

const Square: React.FC<{ value: string | null; onClick: () => void; isWinner: boolean; isSuggested: boolean; }> = ({ value, onClick, isWinner, isSuggested }) => (
    <button
        className={`w-20 h-20 sm:w-24 sm:h-24 bg-surface rounded-lg text-4xl sm:text-5xl font-bold flex items-center justify-center transition-all
        ${isWinner ? 'bg-brand-secondary text-background' : isSuggested ? 'ring-4 ring-brand-secondary ring-inset' : 'hover:bg-overlay'}
        ${value === 'X' ? 'text-brand-primary' : 'text-brand-secondary'}`}
        onClick={onClick}
    >
        {value}
    </button>
);

export const TicTacToe: React.FC = () => {
    const [history, setHistory] = useState<{ squares: (string | null)[] }[]>([{ squares: Array(9).fill(null) }]);
    const [stepNumber, setStepNumber] = useState(0);
    const [mode, setMode] = useState<GameMode>('pva');
    const [gameState, setGameState] = useState<GameState>('menu');
    const [suggestedMove, setSuggestedMove] = useState<number | null>(null);
    const xIsNext = stepNumber % 2 === 0;

    const current = history[stepNumber];
    const { winner, line: winningLine } = calculateWinner(current.squares);
    const isDraw = !winner && current.squares.every(Boolean);

    const makeMove = (i: number) => {
        const newHistory = history.slice(0, stepNumber + 1);
        const currentBoard = newHistory[newHistory.length - 1];
        const squares = [...currentBoard.squares];
        if (winner || squares[i]) {
            return;
        }
        squares[i] = xIsNext ? 'X' : 'O';
        setHistory(newHistory.concat([{ squares }]));
        setStepNumber(newHistory.length);
        setSuggestedMove(null);
    }
    
    useEffect(() => {
        if (mode === 'pva' && !xIsNext && !winner && !isDraw) {
            const squares = [...current.squares];
            const bestMove = minimax(squares, 'O');
            if (bestMove.index !== undefined) {
                 setTimeout(() => makeMove(bestMove.index!), 500);
            }
        }
    }, [stepNumber, mode, winner, isDraw]);


    const resetGame = () => {
        setHistory([{ squares: Array(9).fill(null) }]);
        setStepNumber(0);
        setSuggestedMove(null);
    };

    const handleModeSelect = (selectedMode: GameMode) => {
        setMode(selectedMode);
        resetGame();
        setGameState('playing');
    };

    const getSuggestion = () => {
        if (mode !== 'pva' || !xIsNext || winner || isDraw) return;
        const squares = [...current.squares];
        const bestMove = minimax(squares, 'X'); // 'X' is the player
        if (bestMove.index !== undefined) {
            setSuggestedMove(bestMove.index);
            setTimeout(() => setSuggestedMove(null), 1500);
        }
    };

    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-4">Tic-Tac-Toe</h2>
                    <p className="text-text-secondary mb-6">Choose your game mode.</p>
                    <div className="flex flex-col gap-4 w-48">
                        <Button onClick={() => handleModeSelect('pvp')} size="lg">Player vs Player</Button>
                        <Button onClick={() => handleModeSelect('pva')} size="lg">Player vs AI</Button>
                    </div>
                </div>
            </div>
        );
    }


    let status;
    if (winner) {
        status = 'Winner: ' + winner;
    } else if (isDraw) {
        status = 'It\'s a Draw!';
    } else {
        status = `Next player: ${xIsNext ? 'X' : 'O'}`;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="mb-4 text-xl font-semibold">{status}</div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {Array(9).fill(null).map((_, i) => (
                    <Square
                        key={i}
                        value={current.squares[i]}
                        onClick={() => makeMove(i)}
                        isWinner={!!(winningLine && winningLine.includes(i))}
                        isSuggested={i === suggestedMove}
                    />
                ))}
            </div>
            <div className="mt-6 flex gap-4">
                <Button onClick={() => setGameState('menu')} variant="secondary">
                    Back to Menu
                </Button>
                 {mode === 'pva' && (
                    <Button onClick={getSuggestion} variant="secondary" disabled={!xIsNext || !!winner || isDraw}>
                        Suggest Move
                    </Button>
                )}
            </div>
        </div>
    );
};