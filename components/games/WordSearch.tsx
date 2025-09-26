import React, { useState, useEffect, useRef } from 'react';

const WORD_POOL = [
    'REACT', 'GEMINI', 'TYPESCRIPT', 'JAVASCRIPT', 'COMPONENT', 'STATE', 
    'PROPS', 'HOOKS', 'NODEJS', 'HTML', 'CSS', 'STYLING', 'ROUTER', 'CONTEXT', 
    'REDUX', 'EFFECT', 'ASYNC', 'AWAIT', 'PROMISE', 'FETCH', 'API', 'DEBUG',
    'MOBILE', 'DESKTOP', 'CLOUD', 'SERVER', 'CLIENT', 'FRAMEWORK', 'LIBRARY'
];
const GRID_SIZE = 12;

const generateGrid = () => {
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    const placedWords = new Set<string>();
    const wordsToPlace = WORD_POOL.sort(() => 0.5 - Math.random()).slice(0, 8);


    for (const word of wordsToPlace.sort((a,b) => b.length - a.length)) {
        let placed = false;
        for (let i = 0; i < 100; i++) { // 100 attempts to place a word
            const dir = Math.floor(Math.random() * 2); // 0: horizontal, 1: vertical
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);

            if (dir === 0 && c + word.length <= GRID_SIZE) {
                let canPlace = true;
                for (let j = 0; j < word.length; j++) if (grid[r][c + j] && grid[r][c + j] !== word[j]) canPlace = false;
                if (canPlace) {
                    for (let j = 0; j < word.length; j++) grid[r][c + j] = word[j];
                    placed = true;
                }
            } else if (dir === 1 && r + word.length <= GRID_SIZE) {
                let canPlace = true;
                for (let j = 0; j < word.length; j++) if (grid[r + j][c] && grid[r + j][c] !== word[j]) canPlace = false;
                if (canPlace) {
                    for (let j = 0; j < word.length; j++) grid[r + j][c] = word[j];
                    placed = true;
                }
            }
            if (placed) {
                 placedWords.add(word);
                 break;
            }
        }
    }
    // Fill empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!grid[r][c]) {
                grid[r][c] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
            }
        }
    }
    return { grid, wordsToFind: Array.from(placedWords) };
};

const getCellFromTouchEvent = (e: React.TouchEvent): [number, number] | null => {
    const touch = e.touches[0];
    if (!touch) return null;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-r') && element.getAttribute('data-c')) {
        const r = parseInt(element.getAttribute('data-r')!, 10);
        const c = parseInt(element.getAttribute('data-c')!, 10);
        return [r, c];
    }
    return null;
}

export const WordSearch: React.FC = () => {
    const [gridData, setGridData] = useState({grid: [[]] as string[][], wordsToFind: [] as string[]});
    const [foundWords, setFoundWords] = useState(new Set<string>());
    const [selection, setSelection] = useState<[number, number][]>([]);
    const [isSelecting, setIsSelecting] = useState(false);

    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [gridPixelSize, setGridPixelSize] = useState(300);

    useEffect(() => {
        setGridData(generateGrid());
    }, []);
    
    useEffect(() => {
        const updateGridSize = () => {
            if (gridContainerRef.current) {
                const { clientWidth, clientHeight } = gridContainerRef.current;
                const size = Math.min(clientWidth, clientHeight) - 4; // a little padding
                setGridPixelSize(Math.max(200, size));
            }
        };

        const observer = new ResizeObserver(updateGridSize);
        const container = gridContainerRef.current;
        if (container) {
            observer.observe(container);
        }
        
        const timeoutId = setTimeout(updateGridSize, 50);

        return () => {
            clearTimeout(timeoutId);
            if (container) observer.unobserve(container);
        };
    }, []);


    const handleInteractionStart = (r: number, c: number) => {
        setIsSelecting(true);
        setSelection([[r, c]]);
    };

    const handleInteractionMove = (r: number, c: number) => {
        if (!isSelecting || selection.length === 0) return;
        const [startR, startC] = selection[0];
        const newSelection: [number, number][] = [[startR, startC]];
        const dr = Math.sign(r - startR);
        const dc = Math.sign(c - startC);
        
        if (dr === 0 && dc === 0) {
            setSelection(newSelection);
            return;
        };

        if (Math.abs(r - startR) === Math.abs(c - startC) || dr === 0 || dc === 0) { // is line
             let currR = startR + dr, currC = startC + dc;
             while(true) {
                 newSelection.push([currR, currC]);
                 if (currR === r && currC === c) break;
                 if (newSelection.length > GRID_SIZE) break; // safety break
                 currR += dr; currC += dc;
             }
        }
        setSelection(newSelection);
    };

    const handleInteractionEnd = () => {
        setIsSelecting(false);
        if (selection.length === 0) return;
        
        const selectedWord = selection.map(([r, c]) => gridData.grid[r][c]).join('');
        const reversedWord = selectedWord.split('').reverse().join('');

        if (gridData.wordsToFind.includes(selectedWord)) {
            setFoundWords(new Set(foundWords).add(selectedWord));
        } else if (gridData.wordsToFind.includes(reversedWord)) {
            setFoundWords(new Set(foundWords).add(reversedWord));
        }
        setSelection([]);
    };
    
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const cell = getCellFromTouchEvent(e);
        if (cell) handleInteractionStart(cell[0], cell[1]);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const cell = getCellFromTouchEvent(e);
        if (cell) handleInteractionMove(cell[0], cell[1]);
    };
    
    const isSelected = (r: number, c: number) => selection.some(([selR, selC]) => selR === r && selC === c);
    
    const cellSize = gridPixelSize / GRID_SIZE;

    return (
        <div className="flex flex-col sm:flex-row items-stretch justify-center h-full bg-background-dark p-4 rounded-lg gap-8">
            <div ref={gridContainerRef} className="flex-1 flex items-center justify-center min-h-0 min-w-0">
                <div 
                    className="grid gap-px bg-border-color select-none touch-none"
                    onMouseLeave={handleInteractionEnd}
                    onTouchEnd={handleInteractionEnd}
                    onTouchCancel={handleInteractionEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    style={{ 
                        width: gridPixelSize,
                        height: gridPixelSize,
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, 
                        userSelect: 'none' 
                    }}
                >
                    {gridData.grid.map((row, r) => row.map((cell, c) => (
                        <div
                            key={`${r}-${c}`}
                            data-r={r}
                            data-c={c}
                            className={`flex items-center justify-center font-bold cursor-pointer
                            ${isSelected(r,c) ? 'bg-yellow-500 text-black' : 'bg-surface hover:bg-overlay'}`}
                            style={{ fontSize: `${cellSize * 0.6}px` }}
                            onMouseDown={() => handleInteractionStart(r, c)}
                            onMouseEnter={() => handleInteractionMove(r, c)}
                            onMouseUp={handleInteractionEnd}
                        >
                            {cell}
                        </div>
                    )))}
                </div>
            </div>
            <div className="w-full sm:w-48 flex-shrink-0">
                <h3 className="text-xl font-bold mb-2">Find Words:</h3>
                <ul className="space-y-1 columns-2 sm:columns-1">
                    {gridData.wordsToFind.map(word => (
                        <li key={word} className={`text-base sm:text-lg ${foundWords.has(word) ? 'line-through text-text-secondary' : ''}`}>{word}</li>
                    ))}
                </ul>
                {foundWords.size === gridData.wordsToFind.length && gridData.wordsToFind.length > 0 && (
                    <p className="mt-4 text-brand-secondary font-bold">You found them all!</p>
                )}
            </div>
        </div>
    );
};