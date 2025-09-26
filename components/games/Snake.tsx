
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../common/Button.tsx';

const GRID_SIZE = 20;

const DIFFICULTIES = { 'Easy': 250, 'Medium': 200, 'Hard': 150 };
type Difficulty = keyof typeof DIFFICULTIES;

const getRandomCoords = (snake: {x: number, y: number}[]) => {
    let x, y;
    do {
        x = Math.floor(Math.random() * GRID_SIZE);
        y = Math.floor(Math.random() * GRID_SIZE);
    } while (snake.some(segment => segment.x === x && segment.y === y));
    return { x, y };
};

export const Snake: React.FC = () => {
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState(getRandomCoords(snake));
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [speed, setSpeed] = useState(DIFFICULTIES[difficulty]);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [boardSize, setBoardSize] = useState(300);

    const gameContainerRef = useRef<HTMLDivElement>(null);
    const gameLoopRef = useRef<number | null>(null);
    const directionRef = useRef(direction);
    const touchStartRef = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const updateSize = () => {
            if (gameContainerRef.current) {
                const { clientWidth, clientHeight } = gameContainerRef.current;
                const size = Math.min(clientWidth, clientHeight);
                setBoardSize(Math.max(200, size)); // Ensure a minimum size
            }
        };

        const resizeObserver = new ResizeObserver(updateSize);
        const container = gameContainerRef.current;
        if (container) {
            resizeObserver.observe(container);
        }
        updateSize();

        return () => {
            if (container) {
                resizeObserver.unobserve(container);
            }
        };
    }, []);

    const cellSize = boardSize / GRID_SIZE;

    const startGame = useCallback((newDifficulty: Difficulty) => {
        setDifficulty(newDifficulty);
        const initialSnake = [{ x: 10, y: 10 }];
        setSnake(initialSnake);
        setFood(getRandomCoords(initialSnake));
        setDirection({ x: 0, y: -1 });
        directionRef.current = { x: 0, y: -1 };
        setSpeed(DIFFICULTIES[newDifficulty]);
        setGameOver(false);
        setScore(0);
    }, []);
    
    const moveSnake = useCallback(() => {
        if (gameOver) return;

        setSnake(prevSnake => {
            const newSnake = [...prevSnake];
            const head = { ...newSnake[0] };
            head.x += directionRef.current.x;
            head.y += directionRef.current.y;

            // Wall collision
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                setGameOver(true);
                return prevSnake;
            }

            // Self collision
            for (const segment of prevSnake.slice(1)) { // check from 2nd segment
                if (segment.x === head.x && segment.y === head.y) {
                    setGameOver(true);
                    return prevSnake;
                }
            }

            newSnake.unshift(head);

            // Food collision
            if (head.x === food.x && head.y === food.y) {
                setFood(getRandomCoords(newSnake));
                setScore(s => s + 10);
                setSpeed(s => Math.max(50, s * 0.95));
            } else {
                newSnake.pop();
            }

            return newSnake;
        });
    }, [gameOver, food.x, food.y]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { x, y } = directionRef.current;
            switch (e.key) {
                case 'ArrowUp': case 'w': if (y === 0) directionRef.current = { x: 0, y: -1 }; break;
                case 'ArrowDown': case 's': if (y === 0) directionRef.current = { x: 0, y: 1 }; break;
                case 'ArrowLeft': case 'a': if (x === 0) directionRef.current = { x: -1, y: 0 }; break;
                case 'ArrowRight': case 'd': if (x === 0) directionRef.current = { x: 1, y: 0 }; break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    useEffect(() => {
        if (!gameOver) {
            gameLoopRef.current = window.setInterval(moveSnake, speed);
        } else if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameOver, moveSnake, speed]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (gameOver) return;
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current || gameOver) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;

        const dx = endX - touchStartRef.current.x;
        const dy = endY - touchStartRef.current.y;
        
        const MIN_SWIPE_DISTANCE = 20;

        if (Math.abs(dx) < MIN_SWIPE_DISTANCE && Math.abs(dy) < MIN_SWIPE_DISTANCE) {
            touchStartRef.current = null;
            return;
        }
        
        const { x, y } = directionRef.current;

        if (Math.abs(dx) > Math.abs(dy)) { // Horizontal swipe
            if (dx > 0 && x === 0) { // Right
                directionRef.current = { x: 1, y: 0 };
            } else if (dx < 0 && x === 0) { // Left
                directionRef.current = { x: -1, y: 0 };
            }
        } else { // Vertical swipe
            if (dy > 0 && y === 0) { // Down
                directionRef.current = { x: 0, y: 1 };
            } else if (dy < 0 && y === 0) { // Up
                directionRef.current = { x: 0, y: -1 };
            }
        }

        touchStartRef.current = null;
    };


    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-background-dark p-2 sm:p-4 rounded-lg">
            <div className="flex-shrink-0 w-full flex justify-between items-center mb-2" style={{ width: boardSize }}>
                 <h2 className="text-lg sm:text-xl font-bold">Snake</h2>
                 <span className="font-semibold text-sm sm:text-base">Score: {score}</span>
            </div>
            <div ref={gameContainerRef} className="w-full flex-1 relative flex items-center justify-center">
                <div
                    className="relative bg-surface border-2 sm:border-4 border-overlay touch-none"
                    style={{ width: boardSize, height: boardSize }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {snake.map((segment, i) => (
                        <div
                            key={i}
                            className={`absolute ${i === 0 ? 'bg-green-400' : 'bg-green-600'}`}
                            style={{
                                left: segment.x * cellSize,
                                top: segment.y * cellSize,
                                width: cellSize,
                                height: cellSize,
                            }}
                        />
                    ))}
                    <div
                        className="absolute bg-red-500 rounded-full"
                        style={{
                            left: food.x * cellSize,
                            top: food.y * cellSize,
                            width: cellSize,
                            height: cellSize,
                        }}
                    />
                    {gameOver && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10 p-4">
                            <h2 className="text-xl sm:text-2xl font-bold">Game Over</h2>
                            <p className="text-base sm:text-lg">Final Score: {score}</p>
                            <Button onClick={() => startGame(difficulty)} className="mt-4">Play Again</Button>
                            <div className="flex gap-2 mt-2">
                                {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                                    <Button key={d} size="sm" variant="secondary" onClick={() => startGame(d)}>{d}</Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
