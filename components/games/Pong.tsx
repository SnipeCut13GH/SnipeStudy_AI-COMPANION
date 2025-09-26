import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button';

const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const BOARD_WIDTH = 600;
const BOARD_HEIGHT = 400;

type GameState = 'idle' | 'playing' | 'paused' | 'over';
type GameMode = '1p' | '2p';

export const Pong: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>('idle');
    const [mode, setMode] = useState<GameMode>('1p');
    const [difficulty, setDifficulty] = useState(0.08); // AI paddle speed factor
    const [paddle1Y, setPaddle1Y] = useState(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const [paddle2Y, setPaddle2Y] = useState(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const [ball, setBall] = useState({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2, dx: 5, dy: 5 });
    const [score, setScore] = useState({ p1: 0, p2: 0 });

    const gameLoopRef = useRef<number | null>(null);
    const keysPressed = useRef<Record<string, boolean>>({});

    // Use refs for the game loop logic to avoid stale closures
    const paddle1YRef = useRef(paddle1Y);
    const paddle2YRef = useRef(paddle2Y);
    const ballRef = useRef(ball);
    const scoreRef = useRef(score);

    // Sync state to refs for the game loop to access latest values
    useEffect(() => { paddle1YRef.current = paddle1Y; }, [paddle1Y]);
    useEffect(() => { paddle2YRef.current = paddle2Y; }, [paddle2Y]);
    useEffect(() => { ballRef.current = ball; }, [ball]);
    useEffect(() => { scoreRef.current = score; }, [score]);

    const resetBall = useCallback((winner?: 'p1' | 'p2') => {
        const newBallState = {
            x: BOARD_WIDTH / 2,
            y: BOARD_HEIGHT / 2,
            dx: winner === 'p1' ? 5 : -5,
            dy: Math.random() > 0.5 ? 5 : -5
        };
        ballRef.current = newBallState;
        setBall(newBallState);
    }, []);

    const gameLoop = useCallback(() => {
        // --- LOGIC --- (uses refs)
        // Update paddles
        let newPaddle1Y = paddle1YRef.current;
        if (keysPressed.current['w']) newPaddle1Y -= 5;
        if (keysPressed.current['s']) newPaddle1Y += 5;
        paddle1YRef.current = Math.max(0, Math.min(newPaddle1Y, BOARD_HEIGHT - PADDLE_HEIGHT));

        let newPaddle2Y = paddle2YRef.current;
        if (mode === '2p') {
            if (keysPressed.current['ArrowUp']) newPaddle2Y -= 5;
            if (keysPressed.current['ArrowDown']) newPaddle2Y += 5;
        } else { // AI for paddle 2
            const paddleCenter = newPaddle2Y + PADDLE_HEIGHT / 2;
            const ballY = ballRef.current.y;
            if (paddleCenter < ballY - 10) newPaddle2Y += difficulty * 45;
            if (paddleCenter > ballY + 10) newPaddle2Y -= difficulty * 45;
        }
        paddle2YRef.current = Math.max(0, Math.min(newPaddle2Y, BOARD_HEIGHT - PADDLE_HEIGHT));

        // Update ball
        let b = { ...ballRef.current };
        b.x += b.dx;
        b.y += b.dy;

        // Wall collision (top/bottom)
        if (b.y <= 0 || b.y >= BOARD_HEIGHT - BALL_SIZE) b.dy = -b.dy;

        // Paddle collisions
        if (b.x <= PADDLE_WIDTH && b.y + BALL_SIZE >= paddle1YRef.current && b.y <= paddle1YRef.current + PADDLE_HEIGHT) {
            b.dx = Math.abs(b.dx) * 1.05; // speed up
        }
        if (b.x >= BOARD_WIDTH - PADDLE_WIDTH - BALL_SIZE && b.y + BALL_SIZE >= paddle2YRef.current && b.y <= paddle2YRef.current + PADDLE_HEIGHT) {
            b.dx = -Math.abs(b.dx) * 1.05;
        }
        ballRef.current = b;

        // Score
        if (b.x < 0) {
            scoreRef.current = { ...scoreRef.current, p2: scoreRef.current.p2 + 1 };
            resetBall('p2');
        }
        if (b.x > BOARD_WIDTH) {
            scoreRef.current = { ...scoreRef.current, p1: scoreRef.current.p1 + 1 };
            resetBall('p1');
        }
        
        // --- STATE UPDATE --- (triggers re-render)
        setPaddle1Y(paddle1YRef.current);
        setPaddle2Y(paddle2YRef.current);
        setBall(ballRef.current);
        setScore(scoreRef.current);

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, [mode, difficulty, resetBall]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.key] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.key] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (gameState === 'playing') {
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        } else {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        }
        return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
    }, [gameState, gameLoop]);

    const startGame = () => {
        const newScore = { p1: 0, p2: 0 };
        scoreRef.current = newScore;
        setScore(newScore);
        setPaddle1Y(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
        setPaddle2Y(BOARD_HEIGHT / 2 - PADDLE_HEIGHT / 2);
        resetBall();
        setGameState('playing');
    };

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            {gameState === 'idle' && (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Pong</h2>
                    <div className="flex gap-4 mb-4">
                        <Button onClick={() => setMode('1p')} variant={mode === '1p' ? 'primary' : 'secondary'}>1 Player</Button>
                        <Button onClick={() => setMode('2p')} variant={mode === '2p' ? 'primary' : 'secondary'}>2 Players</Button>
                    </div>
                     {mode === '1p' && (
                        <div className="flex gap-2 items-center justify-center mb-4">
                            <label>Difficulty:</label>
                            <Button size="sm" onClick={() => setDifficulty(0.04)} variant={difficulty === 0.04 ? 'primary' : 'secondary'}>Easy</Button>
                            <Button size="sm" onClick={() => setDifficulty(0.08)} variant={difficulty === 0.08 ? 'primary' : 'secondary'}>Medium</Button>
                            <Button size="sm" onClick={() => setDifficulty(0.12)} variant={difficulty === 0.12 ? 'primary' : 'secondary'}>Hard</Button>
                        </div>
                    )}
                    <Button onClick={startGame}>Start Game</Button>
                </div>
            )}
            {gameState !== 'idle' && (
                 <div className="w-full flex justify-around items-center mb-2">
                    <span className="text-4xl font-bold">{score.p1}</span>
                    <Button onClick={() => setGameState('idle')} variant="secondary" size="sm">Menu</Button>
                    <span className="text-4xl font-bold">{score.p2}</span>
                </div>
            )}
            <div style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }} className="relative bg-black border-2 border-surface">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-1 border-l-4 border-dashed border-gray-600"></div>
                {gameState !== 'idle' && (
                    <>
                        <div style={{ top: paddle1Y, left: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }} className="absolute bg-white rounded" />
                        <div style={{ top: paddle2Y, right: 0, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }} className="absolute bg-white rounded" />
                        <div style={{ top: ball.y, left: ball.x, width: BALL_SIZE, height: BALL_SIZE }} className="absolute bg-white rounded-full" />
                    </>
                )}
            </div>
        </div>
    );
};