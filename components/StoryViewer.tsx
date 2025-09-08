

import React, { useState } from 'react';
// Fix: Correct import paths for types and services.
import { Project, StoryToolData, StorySlide } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';

const DAILY_LIMIT = 4;

const getSlideshowCounter = (): { count: number, date: string } => {
    const stored = localStorage.getItem('snipe-study-slideshow-count');
    if (stored) {
        const data = JSON.parse(stored);
        const today = new Date().toISOString().split('T')[0];
        if (data.date === today) {
            return data;
        }
    }
    return { count: 0, date: new Date().toISOString().split('T')[0] };
};

const incrementSlideshowCounter = () => {
    const counter = getSlideshowCounter();
    counter.count++;
    localStorage.setItem('snipe-study-slideshow-count', JSON.stringify(counter));
};

// --- Story Slideshow Player Component ---
const StorySlideshowPlayer: React.FC<{ slides: StorySlide[], onExit: () => void }> = ({ slides, onExit }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const currentSlide = slides[currentIndex];

    const handleSpeak = () => {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }
        const utterance = new SpeechSynthesisUtterance(`${currentSlide.title}. ${currentSlide.content}`);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    };

    return (
        <div className="h-full flex flex-col items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4 md:p-8">
             <div className="w-full h-full sm:h-[70vh] sm:max-w-4xl bg-background-dark sm:rounded-lg sm:shadow-2xl flex flex-col p-4 md:p-8 text-center relative">
                <h2 className="text-2xl md:text-4xl font-bold text-brand-light mb-6">{currentSlide.title}</h2>
                <p className="flex-1 text-lg md:text-2xl text-text-primary leading-relaxed overflow-y-auto">{currentSlide.content}</p>
                 <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 flex justify-between items-center">
                    <Button onClick={() => setCurrentIndex(i => i-1)} disabled={currentIndex === 0} variant="secondary">Previous</Button>
                    <Button onClick={handleSpeak} variant="primary">{isSpeaking ? "Stop" : "Read Aloud"}</Button>
                    <Button onClick={() => setCurrentIndex(i => i+1)} disabled={currentIndex === slides.length - 1} variant="secondary">Next</Button>
                 </div>
             </div>
             <Button onClick={onExit} variant="ghost" className="mt-8">Back to Story</Button>
        </div>
    );
};

// --- Main Story Viewer Component ---
interface StoryViewerProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): StoryToolData => {
  return project.tools.story || {
    prompt: '',
    story: null,
    slideshow: undefined,
  };
};

export const StoryViewer: React.FC<StoryViewerProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<StoryToolData>(getInitialData(project));
    const [promptInput, setPromptInput] = useState(data.prompt || 'A robot who discovers music for the first time.');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
    
    const slideshowCounter = getSlideshowCounter();

    const updateAndPersist = (newData: Partial<StoryToolData>) => {
        const updatedData = { ...data, ...newData };
        setData(updatedData);
        onUpdateProject({ ...project, tools: { ...project.tools, story: updatedData } });
    };
    
    const handleGenerate = async () => {
        if (!promptInput.trim() || isLoading) return;
        setIsLoading(true);
        try {
            const storyText = await geminiService.generateStory(promptInput);
            updateAndPersist({ prompt: promptInput, story: storyText, slideshow: undefined });
        } catch (error) {
            console.error(error);
            updateAndPersist({ prompt: promptInput, story: "Sorry, I couldn't write a story right now." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateSlideshow = async () => {
        if (!data.story || isGeneratingSlides || slideshowCounter.count >= DAILY_LIMIT) return;
        setIsGeneratingSlides(true);
        try {
            const slides = await geminiService.generateStorySlideshow(data.story);
            updateAndPersist({ slideshow: slides });
            incrementSlideshowCounter();
        } catch (error) {
            console.error("Failed to generate slideshow", error);
        } finally {
            setIsGeneratingSlides(false);
        }
    };
    
    if (data.slideshow) {
        return <StorySlideshowPlayer slides={data.slideshow} onExit={() => updateAndPersist({ slideshow: undefined })} />;
    }

    if (data.story) {
        return (
            <div className="h-full overflow-y-auto bg-background-dark sm:bg-background-darkest sm:p-4 md:p-8">
                <div className="w-full h-full sm:h-auto sm:max-w-3xl mx-auto bg-background-dark p-6 md:p-8 sm:rounded-lg">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Your Prompt</h3>
                    <p className="text-lg text-brand-light italic mb-6">"{data.prompt}"</p>
                    <div className="prose prose-invert max-w-none prose-p:text-text-primary prose-headings:text-text-primary whitespace-pre-wrap leading-relaxed">
                        {data.story}
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <Button onClick={() => updateAndPersist({ story: null, slideshow: undefined })} variant="secondary">
                            Write Another Story
                        </Button>
                        <Button 
                            onClick={handleGenerateSlideshow} 
                            variant="primary"
                            disabled={isGeneratingSlides || slideshowCounter.count >= DAILY_LIMIT}
                        >
                            {isGeneratingSlides ? <Spinner /> : 'Create Slideshow'}
                        </Button>
                    </div>
                    {slideshowCounter.count >= DAILY_LIMIT && (
                        <p className="text-xs text-amber-400 mt-2">You've reached your daily limit of {DAILY_LIMIT} slideshows.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-lg p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg text-center flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-text-primary mb-4">AI Story Writer</h2>
                <p className="text-text-secondary mb-6">What story should we write today?</p>
                <textarea
                    value={promptInput}
                    onChange={e => setPromptInput(e.target.value)}
                    placeholder="Enter a story prompt..."
                    rows={4}
                    className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary resize-none"
                    disabled={isLoading}
                />
                <Button onClick={handleGenerate} disabled={isLoading || !promptInput.trim()} size="lg" className="w-full mt-4">
                    {isLoading ? <Spinner /> : 'Generate Story'}
                </Button>
            </div>
        </div>
    );
};