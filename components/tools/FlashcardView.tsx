import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, FlashcardToolData, FlashcardDeck, Flashcard } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';
// Fix: Import AppSettings to access language preference.
import { AppSettings } from '../../App.tsx';

interface FlashcardViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  // Fix: Add settings prop to pass down language preference.
  settings: AppSettings;
}

const getInitialData = (project: Project): FlashcardToolData => {
  return project.tools.flashcards || { decks: {} };
};

// --- Single Card Component ---
const Card: React.FC<{ card: Flashcard }> = ({ card }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    React.useEffect(() => {
        setIsFlipped(false); // Reset flip on card change
    }, [card]);

    return (
        <div className="w-full h-64 perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transform-style-3d transition-transform duration-500 ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-background-light rounded-lg flex items-center justify-center p-6 text-center shadow-lg border border-border-color">
                    <p className="text-2xl text-text-primary">{card.front}</p>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full backface-hidden bg-brand-primary/20 rounded-lg flex items-center justify-center p-6 text-center shadow-lg border border-brand-primary rotate-y-180">
                    <p className="text-xl text-text-primary">{card.back}</p>
                </div>
            </div>
            <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .rotate-y-180 { transform: rotateY(180deg); } .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }`}</style>
        </div>
    );
};

// --- Deck Study Component ---
const DeckStudyView: React.FC<{ deck: FlashcardDeck; onExit: () => void }> = ({ deck, onExit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => setCurrentIndex(i => (i + 1) % deck.cards.length);
    const handlePrev = () => setCurrentIndex(i => (i - 1 + deck.cards.length) % deck.cards.length);

    if (deck.cards.length === 0) {
        return <div className="text-center p-8"><p>This deck is empty.</p><Button onClick={onExit} className="mt-4">Back to Decks</Button></div>;
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-background-darkest">
            <h2 className="text-3xl font-bold mb-2">{deck.title}</h2>
            <p className="text-text-secondary mb-8">Card {currentIndex + 1} of {deck.cards.length}</p>
            <div className="w-full max-w-xl">
                <Card card={deck.cards[currentIndex]} />
            </div>
            <div className="flex gap-4 mt-8">
                <Button onClick={handlePrev} variant="secondary">Previous</Button>
                <Button onClick={handleNext}>Next</Button>
            </div>
            <Button onClick={onExit} variant="ghost" className="mt-8">Back to Decks</Button>
        </div>
    );
};

export const FlashcardView: React.FC<FlashcardViewProps> = ({ project, onUpdateProject, settings }) => {
    const [data, setData] = useState<FlashcardToolData>(getInitialData(project));
    const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [topicInput, setTopicInput] = useState('');
    const [countInput, setCountInput] = useState(10);

    const updateAndPersist = (newData: FlashcardToolData) => {
        setData(newData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, flashcards: newData } }));
    };

    const handleCreateDeck = async () => {
        if (!topicInput.trim() || isLoading) return;
        setIsLoading(true);
        try {
            // Fix: Pass the user's selected language to the flashcard generation service.
            const cardsData = await geminiService.generateFlashcards(topicInput, countInput, settings.language);
            const newDeck: FlashcardDeck = {
                id: uuidv4(),
                title: topicInput,
                cards: cardsData.map(c => ({...c, id: uuidv4() })),
            };
            updateAndPersist({ decks: { ...data.decks, [newDeck.id]: newDeck } });
            setShowCreate(false);
            setTopicInput('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const activeDeck = activeDeckId ? data.decks[activeDeckId] : null;

    if (activeDeck) {
        return <DeckStudyView deck={activeDeck} onExit={() => setActiveDeckId(null)} />;
    }

    return (
        <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Flashcard Decks</h1>
                <Button onClick={() => setShowCreate(true)}>Create New Deck</Button>
            </div>
            {Object.keys(data.decks).length === 0 && !showCreate && (
                <div className="text-center py-16 bg-background-dark rounded-lg">
                    <p className="text-text-secondary">No decks yet. Create one with AI to get started!</p>
                </div>
            )}
             {Object.keys(data.decks).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Fix: Add explicit type to 'deck' to resolve 'unknown' type errors. */}
                    {Object.values(data.decks).map((deck: FlashcardDeck) => (
                        <div key={deck.id} className="p-6 bg-background-dark rounded-lg cursor-pointer hover:bg-overlay transition-colors" onClick={() => setActiveDeckId(deck.id)}>
                            <h3 className="text-xl font-semibold">{deck.title}</h3>
                            <p className="text-text-secondary">{deck.cards.length} cards</p>
                        </div>
                    ))}
                </div>
            )}
            
            {(showCreate || (Object.keys(data.decks).length === 0)) && (
                <div className="mt-8 p-6 bg-background-dark rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Create a New Deck with AI</h2>
                     <div className="space-y-4 max-w-md">
                        <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="Topic (e.g., 'JavaScript Promises')" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
                        <div>
                            <label className="text-text-secondary text-sm block mb-2">Number of Cards:</label>
                            <input type="number" value={countInput} onChange={e => setCountInput(Math.max(1, Math.min(50, Number(e.target.value))))} min="1" max="50" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={handleCreateDeck} disabled={isLoading || !topicInput.trim()}>
                                {isLoading ? <Spinner /> : 'Generate'}
                            </Button>
                             {Object.keys(data.decks).length > 0 && <Button onClick={() => setShowCreate(false)} variant="secondary">Cancel</Button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};