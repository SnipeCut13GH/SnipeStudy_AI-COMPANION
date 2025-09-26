import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../common/Button';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;

const SHAPES = {
  I: { shape: [[1, 1, 1, 1]], color: 'cyan' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' },
  O: { shape: [[1, 1], [1, 1]], color: 'yellow' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
};
const SHAPE_KEYS = Object.keys(SHAPES);

type Board = (string | null)[][];
const DIFFICULTIES = { 'Easy': 1, 'Medium': 3, 'Hard': 5 }; // Starting levels
type Difficulty = keyof typeof DIFFICULTIES;

const createEmptyBoard = (): Board => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

export const Tetris: React.FC = () => {
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [piece, setPiece] = useState(() => getNewPiece());
    const [nextPiece, setNextPiece] = useState(() => getNewPiece());
    const [score, setScore] = useState(0);
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [level, setLevel] = useState(DIFFICULTIES[difficulty]);
    const [gameOver, setGameOver] = useState(false);
    const lastTimeRef = useRef(0);
    const dropCounterRef = useRef(0);
    const gameLoopRef = useRef<number | null>(null);

    function getNewPiece() {
        const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)] as keyof typeof SHAPES;
        const shape = SHAPES[key];
        return {
            x: Math.floor(COLS / 2) - Math.floor(shape.shape[0].length / 2),
            y: 0,
            shape: shape.shape,
            color: shape.color
        };
    }

    const isValidMove = (p: typeof piece, b: Board) => {
        for (let y = 0; y < p.shape.length; y++) {
            for (let x = 0; x < p.shape[y].length; x++) {
                if (p.shape[y][x]) {
                    const newX = p.x + x;
                    const newY = p.y + y;
                    if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && b[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    };
    
    const rotatePiece = useCallback(() => {
        if (gameOver) return;
        const newShape = piece.shape[0].map((_, colIndex) => piece.shape.map(row => row[colIndex]).reverse());
        const newPiece = { ...piece, shape: newShape };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        }
    }, [board, gameOver, piece]);
    
    const movePiece = useCallback((dx: number) => {
        if (gameOver) return;
        const newPiece = { ...piece, x: piece.x + dx };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        }
    }, [board, gameOver, piece]);

    const placePiece = useCallback(() => {
        const newBoard = board.map(row => [...row]);
        let isGameOver = false;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY < 0) {
                        isGameOver = true;
                    } else {
                        newBoard[boardY][boardX] = piece.color;
                    }
                }
            });
        });

        if (isGameOver) {
            setGameOver(true);
            return;
        }

        let clearedRows = 0;
        for (let r = newBoard.length - 1; r >= 0; ) {
            if (newBoard[r].every(cell => cell !== null)) {
                newBoard.splice(r, 1);
                clearedRows++;
            } else {
                r--;
            }
        }
        while (newBoard.length < ROWS) {
            newBoard.unshift(Array(COLS).fill(null));
        }

        if (clearedRows > 0) {
            setScore(s => s + [0, 100, 300, 500, 800][clearedRows] * level);
            setLevel(l => l + clearedRows);
        }

        setBoard(newBoard);
        setPiece(nextPiece);
        setNextPiece(getNewPiece());
    }, [board, nextPiece, piece, level]);
    
    const dropPiece = useCallback(() => {
        if (gameOver) return;
        const newPiece = { ...piece, y: piece.y + 1 };
        if (isValidMove(newPiece, board)) {
            setPiece(newPiece);
        } else {
            placePiece();
        }
    }, [board, gameOver, piece, placePiece]);

    const startGame = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        setBoard(createEmptyBoard());
        setPiece(getNewPiece());
        setNextPiece(getNewPiece());
        setScore(0);
        setLevel(DIFFICULTIES[newDifficulty]);
        setGameOver(false);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (gameOver) return;
            if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
            }
            switch (e.key) {
                case 'ArrowLeft': movePiece(-1); break;
                case 'ArrowRight': movePiece(1); break;
                case 'ArrowDown': dropPiece(); break;
                case 'ArrowUp': rotatePiece(); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, movePiece, dropPiece, rotatePiece]);

    const gameTick = useCallback((time: number) => {
        if (lastTimeRef.current === 0) lastTimeRef.current = time;
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;
        dropCounterRef.current += deltaTime;

        const dropInterval = Math.max(100, 1000 - (level - 1) * 50);
        if (dropCounterRef.current > dropInterval) {
            dropPiece();
            dropCounterRef.current = 0;
        }

        if (!gameOver) {
            gameLoopRef.current = requestAnimationFrame(gameTick);
        }
    }, [dropPiece, gameOver, level]);

    useEffect(() => {
        if (!gameOver) {
            lastTimeRef.current = 0;
            dropCounterRef.current = 0;
            gameLoopRef.current = requestAnimationFrame(gameTick);
        } else {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        }
        return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
    }, [gameOver, gameTick]);

    const renderBoard = () => {
        const displayBoard = board.map(row => [...row]);
        if (!gameOver) {
            piece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        const boardY = piece.y + y;
                        const boardX = piece.x + x;
                        if (boardY >= 0) {
                            displayBoard[boardY][boardX] = piece.color;
                        }
                    }
                });
            });
        }
        
        return displayBoard.map((row, r) =>
            row.map((cell, c) => (
                <div
                    key={`${r}-${c}`}
                    style={{
                        width: BLOCK_SIZE,
                        height: BLOCK_SIZE,
                        backgroundColor: cell || 'var(--surface)',
                        border: '1px solid var(--background-darkest)'
                    }}
                />
            ))
        );
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center h-full bg-background-dark p-4 rounded-lg gap-8">
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLS}, ${BLOCK_SIZE}px)`,
                    gridTemplateRows: `repeat(${ROWS}, ${BLOCK_SIZE}px)`,
                    width: COLS * BLOCK_SIZE,
                    height: ROWS * BLOCK_SIZE,
                }}
                className="relative bg-background-darkest border-4 border-surface"
            >
                {renderBoard()}
                {gameOver && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10 p-4">
                        <h2 className="text-3xl font-bold">Game Over</h2>
                        <p className="text-xl">Score: {score}</p>
                        <Button onClick={() => startGame(difficulty)} className="mt-4">Play Again</Button>
                        <div className="flex gap-2 mt-2">
                            {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                                <Button key={d} size="sm" variant="secondary" onClick={() => startGame(d as Difficulty)}>{d}</Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-4 text-center w-40">
                <h2 className="text-2xl font-bold">Tetris</h2>
                <div className="p-4 bg-surface rounded-lg">
                    <p className="text-lg">Score</p>
                    <p className="text-2xl font-bold">{score}</p>
                </div>
                 <div className="p-4 bg-surface rounded-lg">
                    <p className="text-lg">Level</p>
                    <p className="text-2xl font-bold">{level}</p>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                    <p className="text-lg">Next</p>
                    <div className="flex justify-center mt-2">
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, ${BLOCK_SIZE / 1.5}px)`,
                        }}>
                        {nextPiece.shape.map((row, r) => (
                            row.map((cell, c) => (
                                <div key={`${r}-${c}`} style={{ width: BLOCK_SIZE / 1.5, height: BLOCK_SIZE / 1.5, backgroundColor: cell ? nextPiece.color : 'transparent' }} />
                            ))
                        ))}
                        </div>
                    </div>
                </div>
                 <div className="p-4 bg-surface rounded-lg">
                     <p className="text-lg">Difficulty</p>
                     <div className="flex flex-col gap-1 mt-2">
                        {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                            <Button key={d} size="sm" onClick={() => setDifficulty(d as Difficulty)} variant={difficulty === d ? 'primary' : 'secondary'}>{d}</Button>
                        )}
                     </div>
                </div>
                <Button onClick={() => startGame(difficulty)}>New Game</Button>
            </div>
        </div>
    );
};