import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../common/Button.tsx';

const EMOJIS = ['🧠', '🔥', '🚀', '⭐', '💡', '🎯', '🎉', '🏆', '📚', '🧪', '⚛️', '🧬'];

const DIFFICULTIES = {
    'Easy': { pairs: 6, grid: 'grid-cols-4' },    // 12 cards
    'Medium': { pairs: 8, grid: 'grid-cols-4' },  // 16 cards
    'Hard': { pairs: 12, grid: 'grid-cols-6' },   // 24 cards
};
type Difficulty = keyof typeof DIFFICULTIES;

const generateCards = (difficulty: Difficulty) => {
    const numPairs = DIFFICULTIES[difficulty].pairs;
    const emojisForGame = EMOJIS.slice(0, numPairs);
    const cards = emojisForGame.concat(emojisForGame)
        .sort(() => Math.random() - 0.5)
        .map((emoji, index) => ({ id: index, emoji, isFlipped: false, isMatched: false }));
    return cards;
};

const Card: React.FC<{ card: any; onFlip: (id: number) => void; isHint: boolean }> = ({ card, onFlip, isHint }) => (
    <div className="w-full h-full perspective-1000" onClick={() => onFlip(card.id)}>
        <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${card.isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-brand-primary rounded-lg flex items-center justify-center shadow-lg cursor-pointer">
            </div>
            {/* Front */}
            <div className={`absolute w-full h-full backface-hidden rounded-lg flex items-center justify-center shadow-lg rotate-y-180 
                ${card.isMatched ? 'bg-green-500/20' : isHint ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-surface'}`}>
                <span className="text-3xl">{card.emoji}</span>
            </div>
        </div>
    </div>
);

export const MemoryGame: React.FC = () => {
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [cards, setCards] = useState(() => generateCards(difficulty));
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [hintsLeft, setHintsLeft] = useState(3);
    const [showHint, setShowHint] = useState<number[]>([]);

    const isGameInProgress = moves > 0 && !isComplete;

    const resetGame = useCallback(() => {
        setCards(generateCards(difficulty));
        setFlippedCards([]);
        setMoves(0);
        setIsComplete(false);
        setHintsLeft(3);
        setShowHint([]);
    }, [difficulty]);
    
    useEffect(() => {
        resetGame();
    }, [difficulty, resetGame]);

    useEffect(() => {
        if (cards.length > 0 && cards.every(c => c.isMatched)) {
            setIsComplete(true);
        }
    }, [cards]);

    useEffect(() => {
        if (flippedCards.length === 2) {
            setMoves(m => m + 1);
            const [firstId, secondId] = flippedCards;
            const firstCard = cards.find(c => c.id === firstId);
            const secondCard = cards.find(c => c.id === secondId);

            if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
                setCards(prevCards =>
                    prevCards.map(card =>
                        card.emoji === firstCard.emoji ? { ...card, isMatched: true } : card
                    )
                );
                setFlippedCards([]);
            } else {
                setTimeout(() => {
                    setCards(prevCards =>
                        prevCards.map(card =>
                            (card.id === firstId || card.id === secondId) ? { ...card, isFlipped: false } : card
                        )
                    );
                    setFlippedCards([]);
                }, 1000);
            }
        }
    }, [flippedCards, cards]);

    const handleFlip = (id: number) => {
        const card = cards.find(c => c.id === id);
        if (!card || card.isFlipped || flippedCards.length === 2) {
            return;
        }

        setCards(prevCards =>
            prevCards.map(c => (c.id === id ? { ...c, isFlipped: true } : c))
        );
        setFlippedCards(prev => [...prev, id]);
    };
    
    const handleHint = () => {
        if (hintsLeft <= 0 || isComplete || flippedCards.length > 0) return;

        const unmatchedCards = cards.filter(c => !c.isMatched && !c.isFlipped);
        if (unmatchedCards.length < 2) return;

        let pair: {id: number}[] | null = null;
        const emojiMap = new Map<string, {id: number}[]>();
        for (const card of unmatchedCards) {
            const list = emojiMap.get(card.emoji) || [];
            list.push(card);
            emojiMap.set(card.emoji, list);
            if (list.length === 2) {
                pair = list;
                break;
            }
        }
        
        if (pair) {
            setHintsLeft(h => h - 1);
            const pairIds = [pair[0].id, pair[1].id];
            setShowHint(pairIds);
            
            setTimeout(() => {
                setShowHint([]);
            }, 1000);
        }
    };


    return (
        <div className="flex flex-col items-center justify-center h-full bg-background-dark p-4 rounded-lg">
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .rotate-y-180 { transform: rotateY(180deg); } .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }`}</style>
            <div className="w-full flex justify-between items-center mb-4 max-w-md flex-wrap gap-2">
                <span className="text-lg font-semibold">Moves: {moves}</span>
                <div className="flex gap-2">
                    {(Object.keys(DIFFICULTIES) as Difficulty[]).map(d =>
                        <Button
                            key={d}
                            size="sm"
                            onClick={() => setDifficulty(d)}
                            variant={difficulty === d ? 'primary' : 'secondary'}
                            disabled={isGameInProgress}
                        >
                            {d}
                        </Button>
                    )}
                </div>
                <div>
                    <Button onClick={handleHint} variant="secondary" size="sm" disabled={hintsLeft <= 0 || isComplete || flippedCards.length > 0} className="mr-2">
                        Hint ({hintsLeft})
                    </Button>
                    <Button onClick={resetGame} variant="secondary" size="sm">Reset</Button>
                </div>
            </div>
            {isComplete ? (
                 <div className="text-center">
                    <h2 className="text-2xl font-bold text-brand-secondary">You Won!</h2>
                    <p className="text-text-secondary">You completed the game in {moves} moves.</p>
                </div>
            ) : (
                <div className={`grid ${DIFFICULTIES[difficulty].grid} gap-2 sm:gap-4 w-full max-w-md mx-auto`}>
                    {cards.map(card => (
                        <div key={card.id} className="aspect-square">
                            <Card card={card} onFlip={handleFlip} isHint={showHint.includes(card.id)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};