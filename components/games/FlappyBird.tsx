import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button';

const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const BIRD_WIDTH = 34;
const BIRD_HEIGHT = 24;
const BIRD_X_POSITION = GAME_WIDTH / 5; // Moved further back for better reaction time
const GRAVITY = 0.5;
const FLAP_STRENGTH = 8;
const PIPE_WIDTH = 52;
const PIPE_SPAWN_RATE = 120; // frames

const DIFFICULTIES = {
    'Easy': { speed: 2, gap: 180 },
    'Medium': { speed: 3, gap: 150 },
    'Hard': { speed: 4, gap: 120 },
};
type Difficulty = keyof typeof DIFFICULTIES;

export const FlappyBird: React.FC = () => {
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [birdHeight, setBirdHeight] = useState(GAME_HEIGHT / 2);
    const [birdVelocity, setBirdVelocity] = useState(0);
    const [pipes, setPipes] = useState<{ x: number, topHeight: number }[]>([]);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
    const gameLoopRef = useRef<number | null>(null);
    const frameCountRef = useRef(0);
    const gameAreaRef = useRef<HTMLDivElement>(null);

    const gameStateRef = useRef(gameState);
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const resetGame = useCallback(() => {
        setBirdHeight(GAME_HEIGHT / 2);
        setBirdVelocity(0);
        setPipes([]);
        setScore(0);
        setGameState('idle');
        frameCountRef.current = 0;
    }, []);

    const flap = useCallback(() => {
        if (gameStateRef.current === 'over') {
            return;
        }
        if (gameStateRef.current === 'idle') {
            setGameState('playing');
        }
        setBirdVelocity(-FLAP_STRENGTH);
    }, []);

    const gameLoop = useCallback(() => {
        if (gameStateRef.current !== 'playing') return;

        // Bird physics
        setBirdVelocity(v => {
            const newVelocity = v + GRAVITY;
            setBirdHeight(h => {
                const newHeight = h + newVelocity;

                if (newHeight > GAME_HEIGHT - BIRD_HEIGHT || newHeight < 0) {
                    setGameState('over');
                    return h;
                }
                return newHeight;
            });
            return newVelocity;
        });

        // Pipe and Score logic
        frameCountRef.current++;
        
        setPipes(currentPipes => {
            let passedPipeCount = 0;
            let newPipes = currentPipes
                .map(p => {
                    const newX = p.x - DIFFICULTIES[difficulty].speed;
                    // Scoring logic: check if the pipe has just crossed the bird's position
                    if (p.x >= BIRD_X_POSITION && newX < BIRD_X_POSITION) {
                        passedPipeCount++;
                    }
                    return { ...p, x: newX };
                })
                .filter(p => p.x > -PIPE_WIDTH);

            if(passedPipeCount > 0) {
                setScore(s => s + passedPipeCount);
            }

            if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
                const gap = DIFFICULTIES[difficulty].gap;
                const topHeight = Math.random() * (GAME_HEIGHT - gap - 50) + 25;
                newPipes.push({ x: GAME_WIDTH, topHeight });
            }
            
            // Collision detection
            const birdX = BIRD_X_POSITION;
            const currentBirdHeight = birdHeight; // Use state value at time of check
            for (const pipe of newPipes) {
                const pipeBottomY = pipe.topHeight + DIFFICULTIES[difficulty].gap;
                if (
                    birdX + BIRD_WIDTH > pipe.x && birdX < pipe.x + PIPE_WIDTH &&
                    (currentBirdHeight < pipe.topHeight || currentBirdHeight + BIRD_HEIGHT > pipeBottomY)
                ) {
                    setGameState('over');
                    break;
                }
            }
            return newPipes;
        });
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);

    }, [difficulty, birdHeight]);

    useEffect(() => {
        if (gameState === 'playing') {
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        } else {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        }
        return () => {
            if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameState, gameLoop]);

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                flap();
            }
        };
        const gameArea = gameAreaRef.current;
        
        const handleInteraction = (e: Event) => {
            // Let clicks on buttons pass through without triggering a flap.
            if ((e.target as HTMLElement).closest('button')) {
                return;
            }
            e.preventDefault();
            flap();
        }

        window.addEventListener('keydown', handleKeyPress);
        gameArea?.addEventListener('mousedown', handleInteraction);
        gameArea?.addEventListener('touchstart', handleInteraction);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
            gameArea?.removeEventListener('mousedown', handleInteraction);
            gameArea?.removeEventListener('touchstart', handleInteraction);
        };
    }, [flap]);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="mb-4 flex flex-wrap justify-center gap-2 items-center">
                <h2 className="text-xl font-bold w-full text-center sm:w-auto">Flappy Bird</h2>
                 {gameState === 'idle' && <div className="flex gap-2">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => 
                        <Button key={d} size="sm" onClick={() => setDifficulty(d)} variant={difficulty === d ? 'primary' : 'secondary'}>{d}</Button>
                    )}
                </div>}
                <span className="font-semibold text-lg">Score: {score}</span>
            </div>
            <div ref={gameAreaRef} style={{ width: GAME_WIDTH, height: GAME_HEIGHT }} className="relative bg-cyan-400 overflow-hidden border-4 border-surface cursor-pointer">
                {/* Bird */}
                <div style={{
                    top: birdHeight,
                    left: BIRD_X_POSITION,
                    width: BIRD_WIDTH,
                    height: BIRD_HEIGHT,
                    transition: 'transform 0.1s linear',
                    transform: `rotate(${Math.min(90, Math.max(-30, birdVelocity * 5))}deg)`,
                }} className="absolute bg-yellow-400 rounded-full" />
                
                {/* Pipes */}
                {pipes.map((pipe, i) => (
                    <React.Fragment key={i}>
                        <div style={{
                            left: pipe.x,
                            top: 0,
                            width: PIPE_WIDTH,
                            height: pipe.topHeight,
                        }} className="absolute bg-green-600 border-2 border-black" />
                        <div style={{
                            left: pipe.x,
                            bottom: 0,
                            width: PIPE_WIDTH,
                            height: GAME_HEIGHT - pipe.topHeight - DIFFICULTIES[difficulty].gap,
                        }} className="absolute bg-green-600 border-2 border-black" />
                    </React.Fragment>
                ))}

                {/* UI */}
                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-center font-bold">
                        <p className="text-2xl">Tap or Press Space to Start</p>
                    </div>
                )}
                {gameState === 'over' && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20 text-white p-4">
                        <p className="text-3xl font-bold">Game Over</p>
                        <p className="text-xl">Final Score: {score}</p>
                        <Button onClick={(e) => { e.stopPropagation(); resetGame(); }} className="mt-4">Play Again</Button>
                        <div className="flex gap-2 mt-2">
                            {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => 
                                <Button key={d} size="sm" variant={difficulty === d ? 'primary' : 'secondary'} onClick={(e) => { e.stopPropagation(); setDifficulty(d); }}>{d}</Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};