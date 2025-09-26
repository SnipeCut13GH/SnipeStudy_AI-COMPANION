import React, { useState } from 'react';
import { MemoryGame } from '../games/MemoryGame.tsx';
import { Button } from '../common/Button.tsx';
import { Snake } from '../games/Snake.tsx';
import { Minesweeper } from '../games/Minesweeper.tsx';
import { Chess } from '../games/Chess.tsx';
import { ConnectFour } from '../games/ConnectFour.tsx';
import { Sudoku } from '../games/Sudoku.tsx';
import { WordSearch } from '../games/WordSearch.tsx';
import { Hangman } from '../games/Hangman.tsx';
import { FlappyBird } from '../games/FlappyBird.tsx';
import { AppSettings } from '../../App.tsx';
import { SosGame } from '../games/SosGame.tsx';
import { TicTacToe } from '../games/TicTacToe.tsx';

const gamesList = [
    { id: 'chess', name: 'Chess', component: Chess },
    { id: 'connect-four', name: 'Connect Four', component: ConnectFour },
    { id: 'flappy-bird', name: 'Flappy Bird', component: FlappyBird },
    { id: 'hangman', name: 'Hangman', component: Hangman },
    { id: 'memory-game', name: 'Memory Game', component: MemoryGame },
    { id: 'minesweeper', name: 'Minesweeper', component: Minesweeper },
    { id: 'snake', name: 'Snake', component: Snake },
    { id: 'sos-game', name: 'SOS Game', component: SosGame },
    { id: 'sudoku', name: 'Sudoku', component: Sudoku },
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', component: TicTacToe },
    { id: 'word-search', name: 'Word Search', component: WordSearch },
].sort((a, b) => a.name.localeCompare(b.name));

export const GamesView: React.FC<{ settings: AppSettings }> = ({ settings }) => {
    const [activeGame, setActiveGame] = useState<(typeof gamesList)[number] | null>(null);

    if (activeGame) {
        const GameComponent = activeGame.component as React.FC<any>;
        return (
            <div className="h-full flex flex-col p-4 sm:p-6 bg-background-darkest">
                <div className="flex-shrink-0 mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{activeGame.name}</h2>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setActiveGame(null)} variant="secondary" size="sm">
                            &larr; Back to Games
                        </Button>
                    </div>
                </div>
                <div className="flex-grow rounded-lg overflow-y-auto">
                    <GameComponent settings={settings} />
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 h-full overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">Educational Games</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {gamesList.map(game => (
                    <div
                        key={game.id}
                        onClick={() => setActiveGame(game)}
                        className="p-4 bg-surface rounded-lg aspect-square flex flex-col items-center justify-center text-center cursor-pointer hover:bg-overlay transition-transform transform hover:-translate-y-1 shadow-md"
                    >
                        <span className="text-sm sm:text-base font-semibold">{game.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};