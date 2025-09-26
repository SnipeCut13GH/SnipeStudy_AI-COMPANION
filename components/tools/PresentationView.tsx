import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, PresentationToolData, PresentationSlide } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';
import { useToast, AppSettings } from '../../App.tsx';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface PresentationViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  // Fix: Add settings prop to be able to access language preference.
  settings: AppSettings;
}

const getInitialData = (project: Project): PresentationToolData => {
  return project.tools.presentation || {
    slides: [{ id: uuidv4(), title: 'Welcome!', content: 'Generate a presentation with AI to begin.', layout: 'title', notes: '' }],
  };
};

const generatePresentationHtml = (slides: PresentationSlide[], title: string) => {
    const slideHtml = slides.map((slide, index) => `
        <section class="slide">
            <div class="slide-content">
                ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="Slide ${index + 1} image" class="slide-image">` : ''}
                <div class="slide-text">
                    <h2>${slide.title}</h2>
                    <p>${slide.content.replace(/\n/g, '<br/>')}</p>
                </div>
            </div>
        </section>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #111; color: #fff; }
                .slide { width: 100%; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 2rem; box-sizing: border-box; border-bottom: 1px solid #333; }
                .slide:last-child { border-bottom: none; }
                .slide-content { display: flex; flex-direction: column; align-items: center; gap: 2rem; max-width: 900px; }
                .slide-image { max-width: 70%; max-height: 40vh; border-radius: 8px; object-fit: cover; }
                .slide-text h2 { font-size: 3rem; margin-bottom: 1rem; }
                .slide-text p { font-size: 1.5rem; line-height: 1.6; }
            </style>
        </head>
        <body>
            ${slideHtml}
        </body>
        </html>
    `;
};


export const PresentationView: React.FC<PresentationViewProps> = ({ project, onUpdateProject, settings }) => {
    const [data, setData] = useState<PresentationToolData>(getInitialData(project));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [showGenModal, setShowGenModal] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const { showToast } = useToast();
    const currentSlide = data.slides[currentIndex];

    const updateAndPersist = (newData: PresentationToolData) => {
        setData(newData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, presentation: newData } }));
    };

    const handleGenerate = async () => {
        if (!genTopic.trim()) return;
        setIsGenerating(true);
        setShowGenModal(false);
        setGenerationStatus('Generating slide content...');
        try {
            // Fix: Pass the user's selected language to the presentation generation service.
            const slidesFromAI = await geminiService.generatePresentation(genTopic, settings.language);
            let slidesWithIds = slidesFromAI.map(s => ({ ...s, id: uuidv4(), layout: 'content' as const, imageUrl: undefined }));
            updateAndPersist({ slides: slidesWithIds });
            setCurrentIndex(0);

            // Now, generate images for each slide
            for (let i = 0; i < slidesWithIds.length; i++) {
                setGenerationStatus(`Generating image ${i + 1} of ${slidesWithIds.length}...`);
                const slide = slidesWithIds[i];
                if (slide.imagePrompt) {
                    try {
                        await sleep(2000); // Add a delay to prevent rate-limiting
                        const imageUrl = await geminiService.generateImage(slide.imagePrompt);
                        slidesWithIds[i] = { ...slide, imageUrl };
                        // Persist after each image generation
                        updateAndPersist({ slides: [...slidesWithIds] });
                    } catch (imgError: any) {
                        console.error(`Failed to generate image for slide ${i + 1}:`, imgError);
                        showToast(`Image for slide ${i + 1} failed: ${imgError.message}`, 7000);
                        // Continue to the next slide even if one fails
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            showToast(`Error generating presentation: ${error.message}`);
        } finally {
            setIsGenerating(false);
            setGenerationStatus('');
            setGenTopic('');
        }
    };
    
    const handleDownload = () => {
        const htmlContent = generatePresentationHtml(data.slides, genTopic || project.name);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${genTopic.replace(/\s+/g, '_') || 'presentation'}.html`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const updateSlideText = (id: string, field: 'title' | 'content' | 'notes', value: string) => {
        const newSlides = data.slides.map(s => s.id === id ? { ...s, [field]: value } : s);
        updateAndPersist({ slides: newSlides });
    };

    if (isGenerating) {
        return (
             <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <Spinner size="lg" />
                <p className="text-lg font-semibold text-text-secondary">{generationStatus}</p>
            </div>
        )
    }

    if (!currentSlide) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center">
                <p className="mb-4">No slides available.</p>
                <Button onClick={() => setShowGenModal(true)} variant="secondary">Generate with AI</Button>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col sm:flex-row bg-background-darkest">
            <div className="flex-shrink-0 bg-surface p-2 flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 overflow-x-auto sm:overflow-y-auto sm:w-64">
                {data.slides.map((slide, index) => (
                    <div key={slide.id} onClick={() => setCurrentIndex(index)}
                        className={`p-2 rounded cursor-pointer border-2 flex-shrink-0 w-40 sm:w-auto ${index === currentIndex ? 'border-brand-primary bg-overlay' : 'border-transparent hover:bg-overlay'}`}>
                        <p className="text-xs text-text-secondary">Slide {index + 1}</p>
                        <p className="text-sm font-semibold truncate">{slide.title}</p>
                         {slide.imageUrl && <img src={slide.imageUrl} alt={slide.title} className="w-full aspect-video object-cover rounded mt-1"/>}
                    </div>
                ))}
                <div className="pt-2 flex sm:flex-col gap-2 sticky right-0 sm:bottom-0 bg-surface">
                    <Button onClick={handleDownload} size="sm" variant="secondary" className="w-full">Download</Button>
                    <Button onClick={() => setShowGenModal(true)} size="sm" variant="secondary" className="w-full">AI Generate</Button>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-background-dark rounded-lg shadow-lg min-h-0">
                     <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4">
                        {currentSlide.imageUrl ? (
                           <img src={currentSlide.imageUrl} alt={currentSlide.title} className="max-h-[40%] max-w-full object-contain rounded-lg"/>
                        ) : (
                           <div className="w-full h-[40%] bg-background-darkest rounded-lg flex items-center justify-center text-text-secondary">Image will appear here</div>
                        )}
                        <input
                            value={currentSlide.title}
                            onChange={e => updateSlideText(currentSlide.id, 'title', e.target.value)}
                            className="text-xl sm:text-2xl md:text-4xl font-bold bg-transparent text-center focus:outline-none w-full max-w-3xl"
                        />
                        <textarea
                            value={currentSlide.content}
                            onChange={e => updateSlideText(currentSlide.id, 'content', e.target.value)}
                            className="text-sm sm:text-base md:text-lg bg-transparent text-center focus:outline-none flex-1 resize-none w-full max-w-3xl"
                        />
                    </div>
                </div>
                <div className="h-28 sm:h-40 flex-shrink-0 bg-surface rounded-lg p-2 sm:p-3 flex flex-col">
                    <h4 className="text-sm font-semibold text-text-secondary mb-2">Speaker Notes</h4>
                     <textarea
                        value={currentSlide.notes}
                        onChange