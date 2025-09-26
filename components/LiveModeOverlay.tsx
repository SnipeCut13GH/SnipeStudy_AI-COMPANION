import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as geminiService from '../services/geminiService.ts';
import { AppSettings } from '../App.tsx';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageRole } from '../types.ts';
import { Button } from './common/Button.tsx';
import { TypingIndicator } from './TypingIndicator.tsx';

interface LiveModeOverlayProps {
  onClose: () => void;
  settings: AppSettings;
}

interface TranscriptTurn {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const statusConfig = {
    idle: { color: 'bg-brand-primary', text: 'Tap the orb to start speaking.' },
    listening: { color: 'bg-brand-primary orb-listening', text: 'Listening...' },
    thinking: { color: 'bg-yellow-500', text: 'Thinking...' },
    speaking: { color: 'bg-green-500', text: '' },
};

const RotateCameraIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5m-4-1v-4h4m-4 4l4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4h5v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l16-16" />
    </svg>
);


export const LiveModeOverlay: React.FC<LiveModeOverlayProps> = ({ onClose, settings }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptTurn[]>([]);
  const [currentUserTranscript, setCurrentUserTranscript] = useState('');
  const [currentAiResponse, setCurrentAiResponse] = useState('');
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const lastFrameRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  
  const finalTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  
  const aiTranscriptRef = useRef<HTMLDivElement>(null);
  const userTranscriptRef = useRef<HTMLDivElement>(null);
  const mobileTranscriptRef = useRef<HTMLDivElement>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
    }
  }, []);
  
  const processRequest = useCallback(async (transcript: string) => {
    if (isProcessingRef.current || !transcript.trim()) {
        if(isMounted.current) setStatus('idle');
        finalTranscriptRef.current = '';
        return;
    }
    isProcessingRef.current = true;
    if(isMounted.current) {
        setStatus('thinking');
        setCurrentAiResponse('');
    }
    
    try {
        const userMessage: Message = {
            id: uuidv4(),
            role: MessageRole.USER,
            text: `Based on what you see, answer this: ${transcript}`,
            images: isCameraEnabled && lastFrameRef.current ? [lastFrameRef.current] : undefined,
        };
        // FIX: Added the missing 'isWebSearch' argument (set to false).
        const { text } = await geminiService.generateChatResponse([userMessage], settings.systemInstruction, false);
        
        // Clean the text to remove markdown asterisks that the TTS engine might read aloud.
        const cleanedText = text.replace(/\*/g, '');

        if(isMounted.current) {
            setCurrentAiResponse(cleanedText);
            setStatus('speaking');
        }
    } catch (apiError: any) {
        console.error("Live Mode API error:", apiError);
        const errorMessage = apiError.message || "Sorry, I encountered an error.";
        if(isMounted.current) {
            setError(errorMessage);
            setCurrentAiResponse(errorMessage);
            setStatus('speaking');
        }
    } finally {
        finalTranscriptRef.current = '';
        isProcessingRef.current = false;
    }
  }, [settings.systemInstruction, isCameraEnabled]);
  
  const processRequestRef = useRef(processRequest);
  useEffect(() => {
    processRequestRef.current = processRequest;
  }, [processRequest]);

  // Main lifecycle effect for setup and teardown - runs once
  useEffect(() => {
    isMounted.current = true;
    
    navigator.mediaDevices.enumerateDevices()
      .then(allDevices => {
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        if (isMounted.current) setDevices(videoDevices);
      })
      .catch(e => console.error("Could not enumerate devices:", e));

    if (!SpeechRecognition) {
        setError("Speech recognition is not supported by your browser.");
        return;
    }
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language;

    recognition.onresult = (event: any) => {
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final += event.results[i][0].transcript;
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        if (isMounted.current) setCurrentUserTranscript(finalTranscriptRef.current + interim);
        if (final) finalTranscriptRef.current += final + ' ';

        if (event.results[event.results.length - 1].isFinal) {
            speechTimeoutRef.current = window.setTimeout(() => {
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }
            }, 1500); // Auto-stop after 1.5s of silence
        }
    };

    recognition.onend = () => {
        if (!isMounted.current) return;
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        
        const finalTranscript = finalTranscriptRef.current.trim();
        if (finalTranscript) {
            setTranscriptHistory(prev => [...prev, {id: uuidv4(), speaker: 'user', text: finalTranscript}]);
            processRequestRef.current(finalTranscript);
        } else {
             if(isMounted.current) setStatus('idle');
        }
        setCurrentUserTranscript('');
    };
    
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
            setError("Microphone access was denied.");
        } else {
            setError(`Speech error: ${event.error}`);
        }
        if (isMounted.current) setStatus('idle');
        finalTranscriptRef.current = '';
    };

    recognition.onstart = () => {
        if(isMounted.current) setStatus('listening');
    }

    return () => {
        isMounted.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        stopCameraStream();
        window.speechSynthesis.cancel();
    };
  }, [settings.language, stopCameraStream]);

  // Effect for handling the camera
  useEffect(() => {
    if (isCameraEnabled) {
        const startStream = async () => {
            try {
                const deviceId = devices[currentDeviceIndex]?.deviceId;
                // FIX: The `deviceId` property of MediaTrackConstraints cannot be a boolean.
                // Using `undefined` as a fallback correctly requests the default camera.
                const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined } };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (isMounted.current) {
                    streamRef.current = stream;
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } else {
                    stream.getTracks().forEach(track => track.stop());
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if(isMounted.current) setError("Could not access camera. Please check permissions.");
            }
        };
        startStream();
    } else {
        stopCameraStream();
    }
  }, [isCameraEnabled, devices, currentDeviceIndex, stopCameraStream]);

  // Effect for capturing video frames
  useEffect(() => {
    let intervalId: number | null = null;
    if (isCameraEnabled && videoRef.current) {
        intervalId = window.setInterval(() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video && canvas && video.readyState >= 2) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0);
                lastFrameRef.current = canvas.toDataURL('image/jpeg', 0.5);
            }
        }, 500); // Capture frame every 500ms
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isCameraEnabled]);

  // Effect for Text-to-Speech
  useEffect(() => {
    if (status === 'speaking' && currentAiResponse) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentAiResponse);
        
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === settings.aiVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.rate = settings.aiSpeed;
        utterance.pitch = settings.aiPitch;

        utterance.onboundary = (event) => {
            const words = currentAiResponse.split(/\s+/);
            let charCount = 0;
            for(let i=0; i < words.length; i++) {
                charCount += words[i].length + 1;
                if (event.charIndex < charCount) {
                    if(isMounted.current) setHighlightedWordIndex(i);
                    break;
                }
            }
        };

        utterance.onend = () => {
            if (isMounted.current) {
                setTranscriptHistory(prev => [...prev, {id: uuidv4(), speaker: 'ai', text: currentAiResponse}]);
                setCurrentAiResponse('');
                setStatus('idle');
                setHighlightedWordIndex(-1);
            }
        };
        
        window.speechSynthesis.speak(utterance);
    }
  }, [status, currentAiResponse, settings]);
  
  // Handlers
  const handleOrbClick = () => {
    if (status === 'listening') {
        if (recognitionRef.current) recognitionRef.current.stop();
    } else if (status === 'idle') {
        if (recognitionRef.current) {
             try {
                recognitionRef.current.start();
            } catch (e) {
                console.error("Could not start recognition:", e);
                setError("Could not start listening. Please try again.");
                setStatus('idle');
            }
        }
    } else if (status === 'speaking') {
        window.speechSynthesis.cancel();
        if(isMounted.current) setStatus('idle');
    }
  };
  
  const handleSwitchCamera = () => {
    if (devices.length > 1) {
        setCurrentDeviceIndex(prev => (prev + 1) % devices.length);
    }
  };

  const aiResponseWords = currentAiResponse.split(/\s+/);
  
  // FIX: Added return statement with JSX to fix component type error and render the overlay.
  return createPortal(
      <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-between p-4 sm:p-8 backdrop-blur-sm text-white font-sans">
        <div className="w-full flex justify-between items-start">
            <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-48 h-36 object-cover rounded-lg shadow-lg transition-opacity duration-300" style={{ opacity: isCameraEnabled ? 1 : 0 }} />
                <canvas ref={canvasRef} className="hidden" />
                {!isCameraEnabled && <div className="w-48 h-36 bg-background-dark rounded-lg flex items-center justify-center text-text-secondary">Camera Off</div>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
                {devices.length > 1 && <Button onClick={handleSwitchCamera} variant="secondary" size="sm" className="p-2 aspect-square"><RotateCameraIcon/></Button>}
                <Button onClick={() => setIsCameraEnabled(!isCameraEnabled)} variant="secondary" size="sm" className="p-2 aspect-square">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </Button>
                <Button onClick={onClose} variant="secondary" size="sm" className="p-2 aspect-square">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
            </div>
        </div>

        <div className="w-full max-w-4xl text-center">
            {currentAiResponse ? (
                 <p className="text-3xl sm:text-4xl font-semibold transition-opacity duration-500">
                    {aiResponseWords.map((word, index) => <span key={index} className={index === highlightedWordIndex ? 'text-brand-primary' : 'text-white'}>{word} </span>)}
                </p>
            ) : (
                <p className="text-2xl sm:text-3xl text-gray-400 transition-opacity duration-500 min-h-[4rem]">{currentUserTranscript || statusConfig[status].text}</p>
            )}
        </div>

        <div className="flex flex-col items-center">
            <button onClick={handleOrbClick} className={`w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center ${statusConfig[status].color}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" /></svg>
            </button>
            {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
        </div>
      </div>,
      document.body
  );
};
