import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button';

const ROAD_WIDTH = 300;
const ROAD_HEIGHT = 500;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;

const LANES = [(ROAD_WIDTH / 4) - (CAR_WIDTH / 2), (ROAD_WIDTH / 2) - (CAR_WIDTH / 2), (ROAD_WIDTH * 3 / 4) - (CAR_WIDTH / 2)];
const DIFFICULTIES = { 'Easy': { speed: 3, accel: 0.002 }, 'Medium': { speed: 4, accel: 0.004 }, 'Hard': { speed: 5, accel: 0.006 } };
type Difficulty = keyof typeof DIFFICULTIES;

interface Obstacle {
    id: number;
    x: number;
    y: number;
    color: string;
}

export const StreetRacer: React.FC = () => {
    const [playerLane, setPlayerLane] = useState(1);
    const [obstacles, setObstacles] = useState<Obstacle[]>([]);
    const [score, setScore] = useState(0);
    const [speed, setSpeed] = useState(DIFFICULTIES.Medium.speed);
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [gameOver, setGameOver] = useState(false);
    const [gameState, setGameState] = useState<'idle' | 'playing'>('idle');
    const [roadScroll, setRoadScroll] = useState(0);

    const gameLoopRef = useRef<number | null>(null);
    const lastOpenLaneRef = useRef(1);

    // Refs for game state to use in the loop without re-creating the function
    const playerLaneRef = useRef(playerLane);
    playerLaneRef.current = playerLane;
    const speedRef = useRef(speed);
    speedRef.current = speed;
    const obstaclesRef = useRef(obstacles);
    obstaclesRef.current = obstacles;
    const gameOverRef = useRef(gameOver);
    gameOverRef.current = gameOver;
    const difficultyRef = useRef(difficulty);
    difficultyRef.current = difficulty;


    const resetGame = (newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        setPlayerLane(1);
        setObstacles([]);
        setScore(0);
        setSpeed(DIFFICULTIES[newDifficulty].speed);
        setGameOver(false);
        setGameState('playing');
        setRoadScroll(0);
        lastOpenLaneRef.current = 1;
    };

    const gameLoop = useCallback(() => {
        if (gameOverRef.current) return;

        let collisionDetected = false;
        const playerX = LANES[playerLaneRef.current];
        const playerY = ROAD_HEIGHT - CAR_HEIGHT - 10;
        const HITBOX_MARGIN = 5; // Tighter for fairness

        let nextObstacles = obstaclesRef.current
            .map(o => ({ ...o, y: o.y + speedRef.current }))
            .filter(o => o.y < ROAD_HEIGHT);

        nextObstacles.forEach(o => {
            if (
                playerX < o.x + CAR_WIDTH - HITBOX_MARGIN &&
                playerX + CAR_WIDTH > o.x + HITBOX_MARGIN &&
                playerY < o.y + CAR_HEIGHT - HITBOX_MARGIN &&
                playerY + CAR_HEIGHT > o.y + HITBOX_MARGIN
            ) {
                collisionDetected = true;
            }
        });

        if (collisionDetected) {
            setGameOver(true);
            return;
        }
        
        const lastObstacleY = nextObstacles.reduce((max, o) => Math.max(max, o.y), -Infinity);
        if (nextObstacles.length < 5 && (nextObstacles.length === 0 || lastObstacleY > CAR_HEIGHT * 3)) {
            const lastOpenLane = lastOpenLaneRef.current;
            const possibleNextOpenLanes = [lastOpenLane];
            if (lastOpenLane > 0) possibleNextOpenLanes.push(lastOpenLane - 1);
            if (lastOpenLane < 2) possibleNextOpenLanes.push(lastOpenLane + 1);
            
            const nextOpenLane = possibleNextOpenLanes[Math.floor(Math.random() * possibleNextOpenLanes.length)];
            lastOpenLaneRef.current = nextOpenLane;

            const lanes = [0, 1, 2];
            const spawnLanes = lanes.filter(l => l !== nextOpenLane);
            
            const numToSpawn = Math.random() > 0.3 ? 2 : 1;

            for(let i = 0; i < numToSpawn; i++) {
                if(spawnLanes.length === 0) break;
                const laneIndex = Math.floor(Math.random() * spawnLanes.length);
                const selectedLane = spawnLanes.splice(laneIndex, 1)[0];
                nextObstacles.push({
                    id: Date.now() + i + selectedLane,
                    x: LANES[selectedLane],
                    y: -CAR_HEIGHT,
                    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
                });
            }
        }
        
        setObstacles(nextObstacles);
        setScore(s => s + 1);
        setSpeed(s => s + DIFFICULTIES[difficultyRef.current].accel);
        setRoadScroll(s => s + speedRef.current);

        gameLoopRef.current = requestAnimationFrame(gameLoop);
    }, []);
    
    const movePlayer = useCallback((direction: 'left' | 'right') => {
        if (gameOver || gameState !== 'playing') return;
        if (direction === 'left') {
            setPlayerLane(l => Math.max(0, l - 1));
        } else {
            setPlayerLane(l => Math.min(2, l + 1));
        }
    }, [gameOver, gameState]);

    useEffect(() => {
        if (!gameOver && gameState === 'playing') {
            gameLoopRef.current = requestAnimationFrame(gameLoop);
        }
        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [gameOver, gameLoop, gameState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
                e.preventDefault();
                movePlayer('left');
            } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
                e.preventDefault();
                movePlayer('right');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [movePlayer]);

    if (gameState === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Street Racer</h2>
                 <div className="flex gap-2 items-center justify-center mb-4">
                    <label>Difficulty:</label>
                     {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                        <Button key={d} size="sm" onClick={() => setDifficulty(d)} variant={difficulty === d ? 'primary' : 'secondary'}>{d}</Button>
                    )}
                </div>
                <Button onClick={() => resetGame(difficulty)}>Start Game</Button>
            </div>
        )
    }

    const segmentHeight = 100;
    const numSegments = Math.ceil(ROAD_HEIGHT / segmentHeight) + 1;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <div className="w-full flex justify-between items-center mb-2" style={{ width: ROAD_WIDTH }}>
                <h2 className="text-lg font-bold">Street Racer</h2>
                <span className="font-semibold">Score: {score}</span>
            </div>
            <div style={{ width: ROAD_WIDTH, height: ROAD_HEIGHT }} className="relative bg-gray-600 overflow-hidden border-4 border-surface">
                {[...Array(numSegments)].map((_, i) => (
                    <div key={i} className="absolute w-2 bg-yellow-400" style={{
                        left: 'calc(50% - 4px)',
                        height: segmentHeight / 2,
                        top: ((i * segmentHeight) + roadScroll) % (numSegments * segmentHeight) - segmentHeight
                    }} />
                ))}
                
                <div style={{
                    width: CAR_WIDTH,
                    height: CAR_HEIGHT,
                    left: LANES[playerLane],
                    bottom: 10,
                }} className="absolute bg-red-500 rounded-t-lg transition-all duration-100" />

                {obstacles.map(o => (
                     <div key={o.id} style={{
                        width: CAR_WIDTH,
                        height: CAR_HEIGHT,
                        left: o.x,
                        top: o.y,
                        backgroundColor: o.color
                    }} className="absolute rounded-t-lg" />
                ))}

                 {gameOver && (
                     <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10 p-4">
                        <p className="text-3xl font-bold text-white">Game Over</p>
                        <p className="text-xl text-white">Score: {score}</p>
                        <Button onClick={() => resetGame(difficulty)} className="mt-4">Play Again</Button>
                        <p className="text-white text-sm mt-4 mb-1">Or choose a new difficulty:</p>
                        <div className="flex gap-2">
                            {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => 
                                <Button key={d} size="sm" variant="secondary" onClick={() => resetGame(d)}>{d}</Button>
                            )}
                        </div>
                    </div>
                )}
                
                {gameState === 'playing' && !gameOver && (
                    <div className="absolute bottom-0 left-0 right-0 h-full flex">
                        <div className="w-1/2 h-full" onTouchStart={() => movePlayer('left')} onClick={() => movePlayer('left')}></div>
                        <div className="w-1/2 h-full" onTouchStart={() => movePlayer('right')} onClick={() => movePlayer('right')}></div>
                    </div>
                )}
            </div>
        </div>
    );
};