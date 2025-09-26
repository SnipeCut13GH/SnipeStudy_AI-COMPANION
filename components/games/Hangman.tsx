import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button';

const WORDS = [
    'DEVELOPER', 'INTERFACE', 'COMPONENT', 'FRAMEWORK', 'DATABASE', 'ALGORITHM',
    'FUNCTION', 'VARIABLE', 'CONSTANT', 'ARRAY', 'OBJECT', 'CLASS', 'MODULE',
    'DEBUGGING', 'COMPILER', 'SYNTAX', 'SEMANTICS', 'NETWORK', 'SERVER', 'CLIENT',
    'CLOUD', 'DOCKER', 'GIT', 'HTML', 'CSS', 'PYTHON', 'JAVA', 'API'
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const HangmanDrawing: React.FC<{ wrongGuesses: number }> = ({ wrongGuesses }) => {
    const parts = [
        <line key="base" x1="20" y1="230" x2="100" y2="230" stroke="currentColor" strokeWidth="4" />, // Base
        <line key="pole" x1="60" y1="230" x2="60" y2="50" stroke="currentColor" strokeWidth="4" />,  // Pole
        <line key="beam" x1="60" y1="50" x2="150" y2="50" stroke="currentColor" strokeWidth="4" />,  // Beam
        <line key="rope" x1="150" y1="50" x2="150" y2="80" stroke="currentColor" strokeWidth="4" />, // Rope
        <circle key="head" cx="150" cy="100" r="20" stroke="currentColor" strokeWidth="4" fill="none" />, // Head
        <line key="body" x1="150" y1="120" x2="150" y2="170" stroke="currentColor" strokeWidth="4" />, // Body
        <line key="l-arm" x1="150" y1="130" x2="120" y2="160" stroke="currentColor" strokeWidth="4" />,// Left Arm
        <line key="r-arm" x1="150" y1="130" x2="180" y2="160" stroke="currentColor" strokeWidth="4" />,// Right Arm
        <line key="l-leg" x1="150" y1="170" x2="120" y2="200" stroke="currentColor" strokeWidth="4" />,// Left Leg
        <line key="r-leg" x1="150" y1="170" x2="180" y2="200" stroke="currentColor" strokeWidth="4" /> // Right Leg
    ];
    return (
        <svg viewBox="0 0 250 250" className="w-48 h-48 sm:w-64 sm:h-64">
            {parts.slice(0, wrongGuesses)}
        </svg>
    );
};


export const Hangman: React.FC = () => {
    const [word, setWord] = useState('');
    const [guessed, setGuessed] = useState(new Set<string>());
    
    const newGame = () => {
        setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
        setGuessed(new Set());
    };
    
    useEffect(newGame, []);

    const handleGuess = (letter: string) => {
        setGuessed(new Set(guessed).add(letter));
    };

    const wrongGuesses = Array.from(guessed).filter(letter => !word.includes(letter)).length;
    const isWinner = word && word.split('').every(letter => guessed.has(letter));
    const isLoser = wrongGuesses >= 10;
    const gameOver = isWinner || isLoser;

    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Hangman</h2>
            <HangmanDrawing wrongGuesses={wrongGuesses} />
            
            {gameOver ? (
                <div className="text-center my-4">
                    <p className={`text-3xl font-bold ${isWinner ? 'text-brand-secondary' : 'text-danger'}`}>
                        {isWinner ? 'You Won!' : 'You Lost!'}
                    </p>
                    <p className="text-xl">The word was: {word}</p>
                </div>
            ) : (
                <div className="flex gap-2 sm:gap-4 my-4 text-2xl sm:text-4xl font-mono tracking-widest">
                    {word.split('').map((letter, i) => (
                        <span key={i} className="border-b-4 w-8 sm:w-12 text-center">
                            {guessed.has(letter) ? letter : '_'}
                        </span>
                    ))}
                </div>
            )}
            
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 my-4 max-w-md">
                {ALPHABET.map(letter => (
                    <button
                        key={letter}
                        onClick={() => handleGuess(letter)}
                        disabled={guessed.has(letter) || gameOver}
                        className="w-10 h-10 bg-surface rounded-md font-bold text-lg disabled:bg-overlay disabled:opacity-50 hover:bg-border-color"
                    >
                        {letter}
                    </button>
                ))}
            </div>
            
            <Button onClick={newGame} variant="secondary">New Game</Button>
        </div>
    );
};