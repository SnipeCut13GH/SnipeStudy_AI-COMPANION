import React, { useState } from 'react';
// Fix: Correct import paths for types and services.
import { Project, TranscriptSegment } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';
import { Button } from '../common/Button.tsx';

interface AudioTranscriberViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
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
            onUpdateProject(p => ({ ...p, tools: { ...p.tools, audio_transcription: newAudioData }}));
        } catch(error: any) {
            console.error(error);
            setProgress(error.message);
        } finally {
            setIsTranscribing(false);
        }
    };
    
    if (audioData?.transcript) {
        return (
            <div className="p-8 max-w-3xl mx-auto h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-2">Transcript for: {audioData.audioFile?.name}</h2>
                <Button onClick={() => onUpdateProject(p => ({ ...p, tools: {...p.tools, audio_transcription: undefined }}))} variant="secondary" size="sm" className="mb-4">Transcribe another file</Button>
                <div className="space-y-4 bg-background-light p-4 rounded-lg">
                    {audioData.transcript.map(segment => (
                        <div key={segment.id} className="flex gap-4">
                            <span className="font-mono text-sm text-brand-primary flex-shrink-0 w-16">{segment.startTime.toFixed(1)}s</span>
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
            <p className="text-text-secondary mb-8 max-w-md">Upload an audio file (e.g., MP3, WAV, M4A) and our AI will generate a timestamped transcript for you.</p>
            
            <input type="file" id="audio-upload" accept="audio/*" onChange={handleFileChange} className="hidden" />
            <label htmlFor="audio-upload" className="mb-4 px-6 py-3 border-2 border-dashed border-border-color rounded-lg cursor-pointer hover:bg-overlay hover:border-brand-primary">
                {file ? `Selected: ${file.name}` : 'Choose an Audio File'}
            </label>

            <Button onClick={handleTranscribe} disabled={!file || isTranscribing} size="lg">
                {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
            </Button>
            {progress && <p className="mt-4 text-text-secondary">{progress}</p>}
        </div>
    );
};