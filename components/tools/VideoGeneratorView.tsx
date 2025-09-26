import React, { useState, useEffect, useCallback } from 'react';
import { Project, VideoGeneratorToolData } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';

interface VideoGeneratorViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
}

const getInitialData = (project: Project): VideoGeneratorToolData => {
  return project.tools.video_generator || {
    prompt: '',
    videoUrl: null,
    operation: null,
    status: 'idle',
  };
};

const POLLING_INTERVAL = 10000; // 10 seconds

export const VideoGeneratorView: React.FC<VideoGeneratorViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<VideoGeneratorToolData>(getInitialData(project));

    const updateData = (updater: (currentData: VideoGeneratorToolData) => Partial<VideoGeneratorToolData>) => {
        setData(currentData => {
            const partialNewData = updater(currentData);
            const updated = { ...currentData, ...partialNewData };
            if (updated.status !== 'error') {
                updated.errorMessage = undefined;
            }
            onUpdateProject(p => ({ ...p, tools: { ...p.tools, video_generator: updated } }));
            return updated;
        });
    };

    const handleGenerate = async () => {
        if (!data.prompt.trim() || data.status === 'generating') return;
        
        updateData(() => ({ status: 'generating', videoUrl: null, operation: null }));

        try {
            const initialOperation = await geminiService.generateVideo(data.prompt);
            updateData(() => ({ operation: initialOperation }));
        } catch (error: any) {
            console.error("Failed to start video generation:", error);
            updateData(() => ({ status: 'error', errorMessage: `Failed to start generation: ${error.message}` }));
        }
    };
    
    const pollOperation = useCallback(async () => {
        if (data.status !== 'generating' || !data.operation) {
            return;
        }

        try {
            const updatedOperation = await geminiService.getVideosOperation(data.operation);
            if (updatedOperation.done) {
                const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
                    const blob = await response.blob();
                    const videoUrl = URL.createObjectURL(blob);
                    updateData(() => ({ status: 'complete', videoUrl, operation: null }));
                } else {
                    const failureReason = String(updatedOperation.error?.message || "Video generation completed but no video URI was found.");
                    throw new Error(failureReason);
                }
            } else {
                updateData(() => ({ operation: updatedOperation }));
            }
        } catch (error: any) {
            console.error("Polling error:", error);
            let errorMessage = error.message || "An unknown error occurred during video processing.";
            if (String(error.message).includes('500')) {
                errorMessage = "The video generation service encountered an internal error. Please try again later.";
            }
            updateData(() => ({ status: 'error', errorMessage }));
        }
    }, [data.operation, data.status]);

    useEffect(() => {
        if (data.status === 'generating' && data.operation) {
            const intervalId = setInterval(pollOperation, POLLING_INTERVAL);
            return () => clearInterval(intervalId);
        }
    }, [data.status, data.operation, pollOperation]);

    const renderStatus = () => {
        switch (data.status) {
            case 'generating':
                return (
                    <div className="text-center">
                        <Spinner size="lg" />
                        <p className="mt-4 text-text-secondary font-semibold">Generating video...</p>
                        <p className="text-sm text-text-secondary mt-2">This may take a few minutes. You can safely navigate away and come back.</p>
                    </div>
                );
            case 'complete':
                return (
                    <div className="w-full sm:max-w-2xl aspect-video sm:rounded-lg overflow-hidden sm:shadow-lg">
                        <video src={data.videoUrl!} controls autoPlay loop className="w-full h-full bg-black" />
                    </div>
                );
            case 'error':
                return <p className="text-danger text-center max-w-md">{data.errorMessage || 'An unknown error occurred during video generation. Please try again.'}</p>;
            default:
                return (
                    <div className="text-center max-w-xl">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">AI Video Generator</h2>
                        <p className="text-text-secondary mb-8">Describe a scene, and the AI will bring it to life. Generation can take several minutes.</p>
                    </div>
                )
        }
    };

    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-background-darkest gap-4 sm:gap-8">
            {renderStatus()}
            <div className="w-full max-w-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <input
                    type="text"
                    value={data.prompt}
                    onChange={e => setData(d => ({ ...d, prompt: e.target.value }))}
                    placeholder="e.g., A majestic whale swimming through a coral reef"
                    className="w-full sm:flex-1 bg-background-light border border-border-color p-3 rounded-md text-text-primary"
                    disabled={data.status === 'generating'}
                />
                <Button onClick={handleGenerate} disabled={!data.prompt.trim() || data.status === 'generating'} size="lg" className="w-full sm:w-auto">
                    {data.status === 'generating' ? 'Generating...' : 'Generate'}
                </Button>
            </div>
            {data.videoUrl && (
                <div className="flex gap-4">
                    <a href={data.videoUrl} download={`snipe-study-video-${Date.now()}.mp4`}>
                        <Button variant="secondary">Download Video</Button>
                    </a>
                     <Button onClick={() => updateData(() => ({ status: 'idle', videoUrl: null, prompt: ''}))} variant="ghost">Create another</Button>
                </div>
            )}
        </div>
    );
};