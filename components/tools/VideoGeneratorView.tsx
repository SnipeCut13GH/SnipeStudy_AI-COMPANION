

import React, { useState, useEffect, useRef } from 'react';
import { Project, VideoGeneratorToolData } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';

interface VideoGeneratorViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
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
    const pollingRef = useRef<number | null>(null);

    const updateAndPersist = (newData: Partial<VideoGeneratorToolData>) => {
        const updatedData = { ...data, ...newData };
        if (updatedData.status !== 'error') {
            updatedData.errorMessage = undefined;
        }
        setData(updatedData);
        onUpdateProject({ ...project, tools: { ...project.tools, video_generator: updatedData }});
    };

    const handleGenerate = async () => {
        if (!data.prompt.trim()) return;
        
        stopPolling();
        updateAndPersist({ status: 'generating', videoUrl: null, operation: null, errorMessage: undefined });

        try {
            const initialOperation = await geminiService.generateVideo(data.prompt);
            updateAndPersist({ operation: initialOperation });
            startPolling(initialOperation);
        } catch (error: any) {
            console.error(error);
            let msg = "An error occurred during video generation. Please try again.";
            if (error.message && /quota|limit|billing/i.test(error.message)) {
                msg = "Looks like you've reached your video generation limit for now. Please check your plan and try again later.";
            }
            updateAndPersist({ status: 'error', errorMessage: msg });
        }
    };

    const pollOperation = async (operation: any) => {
        try {
            const updatedOperation = await geminiService.getVideosOperation(operation);
            if (updatedOperation.done) {
                const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    // Fetch the video as a blob and create a local URL
                    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch video: ${response.statusText}`);
                    }
                    const blob = await response.blob();
                    const videoUrl = URL.createObjectURL(blob);
                    updateAndPersist({ status: 'complete', videoUrl: videoUrl, operation: null });
                } else {
                    // Fix: Ensure failureReason is a string to satisfy .test() and new Error().
                    const failureReason = String(updatedOperation.error?.message || "Video generation completed but no video URI was found.");
                     if (/quota|limit|billing/i.test(failureReason)) {
                        throw new Error("Looks like you've reached your video generation limit for now. Please check your plan and try again later.");
                    }
                    throw new Error(failureReason);
                }
                stopPolling();
            } else {
                // Not done, continue polling
                updateAndPersist({ operation: updatedOperation });
                // We need to re-start the timer with the updated operation object
                startPolling(updatedOperation);
            }
        } catch (error: any) {
            console.error("Polling error:", error);
            let msg = "An error occurred while checking the video status. Please try again.";
            if (error.message && /quota|limit|billing/i.test(error.message)) {
                msg = "Looks like you've reached your video generation limit for now. Please check your plan and try again later.";
            }
            updateAndPersist({ status: 'error', errorMessage: msg });
            stopPolling();
        }
    };
    
    const startPolling = (operation: any) => {
        stopPolling(); // Ensure no multiple polls are running
        pollingRef.current = window.setInterval(() => {
            // pass the latest operation object to the poller
            setData(currentData => {
                if (currentData.operation) {
                    pollOperation(currentData.operation);
                }
                return currentData;
            });
        }, POLLING_INTERVAL);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    useEffect(() => {
        // When the component mounts, if there's an ongoing operation, resume polling.
        if (data.operation && data.status === 'generating') {
            startPolling(data.operation);
        }
        return () => stopPolling(); // Cleanup on unmount
    }, []);

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
                    onChange={e => updateAndPersist({ prompt: e.target.value })}
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
                     <Button onClick={() => updateAndPersist({ status: 'idle', videoUrl: null, prompt: ''})} variant="ghost">Create another</Button>
                </div>
            )}
        </div>
    );
};