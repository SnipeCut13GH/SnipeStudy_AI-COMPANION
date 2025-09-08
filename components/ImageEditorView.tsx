

import React, { useState, useRef } from 'react';
// Fix: Correct import paths for types and services.
import { Project, ImageEditorToolData } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';

interface ImageEditorViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): ImageEditorToolData => {
    return project.tools.image_editor || {
        originalImage: null,
        editedImage: null,
        prompt: '',
        status: 'idle',
        errorMessage: undefined,
    };
};

export const ImageEditorView: React.FC<ImageEditorViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<ImageEditorToolData>(getInitialData(project));
    const [mode, setMode] = useState<'edit' | 'generate' | null>(() => data.originalImage ? (data.prompt ? 'edit' : 'generate') : null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateAndPersist = (newData: Partial<ImageEditorToolData>) => {
        const updatedData = { ...data, ...newData };
        setData(updatedData as ImageEditorToolData);
        onUpdateProject({ ...project, tools: { ...project.tools, image_editor: updatedData as ImageEditorToolData }});
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateAndPersist({ originalImage: reader.result as string, editedImage: null, prompt: '', status: 'idle' });
                setMode('edit');
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAction = async () => {
        if (!data.prompt.trim() || data.status === 'generating') return;
        updateAndPersist({ status: 'generating', errorMessage: undefined });
        try {
            if (mode === 'edit' && data.originalImage) {
                const result = await geminiService.editImage(data.prompt, data.originalImage);
                updateAndPersist({ editedImage: result.image, status: 'complete' });
            } else if (mode === 'generate') {
                const result = await geminiService.generateImage(data.prompt);
                updateAndPersist({ originalImage: result, editedImage: result, status: 'complete' });
            }
        } catch (error: any) {
            console.error("Image action failed:", error);
            let msg = "An unexpected error occurred while generating the image.";
            if (error.message && /quota|limit|billing/i.test(error.message)) {
                msg = "Looks like you've reached your image generation limit for now. Please check your plan and try again later.";
            }
            updateAndPersist({ status: 'error', errorMessage: msg });
        }
    };

    const handleDownload = () => {
        if (!data.editedImage) return;
        const link = document.createElement('a');
        link.href = data.editedImage;
        link.download = `snipestudy-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    if (!mode) {
         return (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-4">
                <h2 className="text-3xl font-bold text-center">Image Studio</h2>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <Button onClick={() => fileInputRef.current?.click()} size="lg">Upload to Edit</Button>
                    <Button onClick={() => { setMode('generate'); updateAndPersist({ status: 'idle' }); }} size="lg" variant="secondary">Generate New Image</Button>
                </div>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
        );
    }
    
    const showOriginal = mode === 'edit';
    
    return (
        <div className="w-full h-full flex flex-col sm:p-4 bg-background-dark sm:bg-background-darkest">
            <div className={`flex-1 grid ${showOriginal && data.originalImage ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-px sm:gap-4 overflow-hidden`}>
                {showOriginal && data.originalImage && (
                    <div className="flex flex-col items-center justify-center bg-background-dark p-2 sm:p-4 sm:rounded-lg">
                        <h3 className="font-bold mb-2">Original</h3>
                        <img src={data.originalImage} alt="Original" className="max-w-full max-h-[80%] object-contain"/>
                    </div>
                )}
                <div className="flex flex-col items-center justify-center bg-background-dark p-2 sm:p-4 sm:rounded-lg relative">
                    <h3 className="font-bold mb-2">{mode === 'edit' ? 'Edited' : 'Generated'}</h3>
                    {data.status === 'generating' ? <Spinner size="lg" /> : data.editedImage ? <img src={data.editedImage} alt="Edited" className="max-w-full max-h-[80%] object-contain"/> : <p className="text-text-secondary">Result will appear here</p>}
                    {data.editedImage && (
                        <Button onClick={handleDownload} size="sm" className="absolute top-2 right-2 sm:top-4 sm:right-4">Download</Button>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0 mt-4">
                <div className="p-2 sm:p-4 bg-surface sm:rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                     <Button onClick={() => { setMode(null); updateAndPersist({originalImage: null, editedImage: null, prompt: '', status: 'idle'})}} variant="secondary" className="w-full sm:w-auto">Back</Button>
                    <input
                        type="text"
                        value={data.prompt}
                        onChange={e => updateAndPersist({ prompt: e.target.value })}
                        placeholder={mode === 'edit' ? "e.g., 'add a birthday hat'" : "e.g., 'a cat astronaut on the moon'"}
                        className="w-full sm:flex-1 bg-background-light border border-border-color p-3 rounded-md text-text-primary"
                        disabled={data.status === 'generating'}
                    />
                    <Button onClick={handleAction} disabled={!data.prompt.trim() || data.status === 'generating'} size="lg" className="w-full sm:w-auto">
                        {data.status === 'generating' ? <Spinner /> : mode === 'edit' ? 'Apply Edit' : 'Generate'}
                    </Button>
                </div>
                {data.status === 'error' && <p className="text-danger text-center mt-2 text-sm">{data.errorMessage}</p>}
            </div>
        </div>
    );
};