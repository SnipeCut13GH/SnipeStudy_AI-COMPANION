import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, PresentationToolData, PresentationSlide } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';

interface PresentationViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): PresentationToolData => {
  return project.tools.presentation || {
    slides: [{ id: uuidv4(), title: 'Welcome!', content: 'This is your first slide.', layout: 'title', notes: '' }],
  };
};

export const PresentationView: React.FC<PresentationViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<PresentationToolData>(getInitialData(project));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenModal, setShowGenModal] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const currentSlide = data.slides[currentIndex];

    const updateAndPersist = (newData: PresentationToolData) => {
        setData(newData);
        onUpdateProject({ ...project, tools: { ...project.tools, presentation: newData } });
    };

    const addSlide = () => {
        const newSlide: PresentationSlide = { id: uuidv4(), title: 'New Slide', content: '', layout: 'content', notes: '' };
        updateAndPersist({ slides: [...data.slides, newSlide] });
        setCurrentIndex(data.slides.length);
    };

    const handleGenerate = async () => {
        if (!genTopic.trim()) return;
        setIsGenerating(true);
        try {
            const slidesFromAI = await geminiService.generatePresentation(genTopic);
            const slidesWithIds = slidesFromAI.map(s => ({ ...s, id: uuidv4(), layout: 'content' as const }));
            updateAndPersist({ slides: slidesWithIds });
            setCurrentIndex(0);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
            setShowGenModal(false);
            setGenTopic('');
        }
    };

    const updateSlide = (id: string, updates: Partial<PresentationSlide>) => {
        const newSlides = data.slides.map(s => s.id === id ? { ...s, ...updates } : s);
        updateAndPersist({ slides: newSlides });
    };

    if (!currentSlide) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center">
                <p className="mb-4">No slides available.</p>
                <div className="flex gap-4">
                    <Button onClick={addSlide}>Add a Slide</Button>
                    <Button onClick={() => setShowGenModal(true)} variant="secondary">Generate with AI</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex bg-background-darkest">
            {/* Sidebar with slide previews */}
            <div className="w-56 bg-surface p-2 space-y-2 overflow-y-auto flex-shrink-0">
                {data.slides.map((slide, index) => (
                    <div key={slide.id} onClick={() => setCurrentIndex(index)}
                        className={`p-2 rounded cursor-pointer border-2 ${index === currentIndex ? 'border-brand-primary bg-overlay' : 'border-transparent hover:bg-overlay'}`}>
                        <p className="text-xs text-text-secondary">Slide {index + 1}</p>
                        <p className="text-sm font-semibold truncate">{slide.title}</p>
                    </div>
                ))}
                <div className="pt-2 space-y-2">
                    <Button onClick={addSlide} size="sm" variant="secondary" className="w-full">Add Slide</Button>
                    <Button onClick={() => setShowGenModal(true)} size="sm" variant="secondary" className="w-full">AI Generate</Button>
                </div>
            </div>

            {/* Main slide editor */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                <div className="flex-1 flex items-center justify-center p-4 bg-background-dark rounded-lg shadow-lg">
                     <div className="w-full max-w-4xl aspect-video bg-background-dark flex flex-col justify-center text-center">
                        <input
                            value={currentSlide.title}
                            onChange={e => updateSlide(currentSlide.id, { title: e.target.value })}
                            className="text-4xl font-bold bg-transparent text-center focus:outline-none mb-4"
                        />
                        <textarea
                            value={currentSlide.content}
                            onChange={e => updateSlide(currentSlide.id, { content: e.target.value })}
                            className="text-lg bg-transparent text-center focus:outline-none flex-1 resize-none"
                        />
                    </div>
                </div>
                <div className="h-40 flex-shrink-0 bg-surface rounded-lg p-3 flex flex-col">
                    <h4 className="text-sm font-semibold text-text-secondary mb-2">Speaker Notes</h4>
                     <textarea
                        value={currentSlide.notes}
                        onChange={e => updateSlide(currentSlide.id, { notes: e.target.value })}
                        className="w-full h-full bg-background-dark focus:outline-none text-text-primary resize-none text-sm p-2 rounded"
                        placeholder="Add speaker notes here..."
                    />
                </div>
            </div>
             {showGenModal && (
                <Modal isOpen={showGenModal} onClose={() => setShowGenModal(false)} title="Generate Presentation with AI">
                    <div className="space-y-4">
                        <p className="text-text-secondary">Enter a topic, and the AI will generate a set of slides for you.</p>
                        <input
                            type="text"
                            value={genTopic}
                            onChange={e => setGenTopic(e.target.value)}
                            placeholder="e.g., A brief history of the internet"
                            className="w-full bg-background-dark border border-border-color p-3 rounded-md text-text-primary"
                            disabled={isGenerating}
                        />
                        <Button onClick={handleGenerate} disabled={isGenerating || !genTopic.trim()} className="w-full">
                            {isGenerating ? <Spinner /> : 'Generate Slides'}
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};