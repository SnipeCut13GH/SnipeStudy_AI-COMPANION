import React, { useState } from 'react';
// Fix: Correct import paths for types and services.
import { Project, TranscriptSegment } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';

interface AudioTranscriberViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

export const AudioTranscriberView: React.FC<AudioTranscriberViewProps> = ({ project, onUpdateProject }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [progress, setProgress] = useState('');
    const audioData = project.tools.audio_transcription;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
    
    const handleTranscribe = async () => {
        if (!file) return;
        setIsTranscribing(true);
        setProgress('Starting...');
        try {
            const transcript = await geminiService.transcribeAudio(file, setProgress);
            const newAudioData = { 
                audioFile: { name: file.name, url: URL.createObjectURL(file) },
                transcript: transcript,
            };
            onUpdateProject({ ...project, tools: { ...project.tools, audio_transcription: newAudioData }});
        } catch(error) {
            console.error(error);
            setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsTranscribing(false);
        }
    };
    
    if (audioData?.transcript) {
        return (
            <div className="p-8 max-w-3xl mx-auto">
                <h2 className="text-xl font-bold mb-2">Transcript for: {audioData.audioFile?.name}</h2>
                <button onClick={() => onUpdateProject({ ...project, tools: {...project.tools, audio_transcription: undefined }})} className="text-sm text-red-400 mb-4">Transcribe another file</button>
                <div className="space-y-4 bg-background-light p-4 rounded-lg">
                    {audioData.transcript.map(segment => (
                        <div key={segment.id} className="flex gap-4">
                            <span className="font-mono text-sm text-brand-primary">{segment.startTime.toFixed(1)}s</span>
                            <p className="text-text-primary">{segment.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Audio Transcription</h2>
            <p className="text-text-secondary mb-8">Upload an audio file (.mp3, .wav) to get started.</p>
            <input type="file" accept="audio/*" onChange={handleFileChange} className="mb-4" />
            <button onClick={handleTranscribe} disabled={!file || isTranscribing} className="px-6 py-3 bg-brand-primary rounded-md disabled:opacity-50">
                {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
            </button>
            {isTranscribing && <p className="mt-4 text-text-secondary">{progress}</p>}
        </div>
    );
};