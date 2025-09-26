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
        if (isMounted.current) {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                 setError("Microphone access denied. Please enable it in your browser settings.");
            } else {
                 setError("An error occurred with speech recognition.");
            }
            setStatus('idle');
        }
    };

    return () => {
        isMounted.current = false;
        stopCameraStream();
        if (recognitionRef.current) recognitionRef.current.abort();
        window.speechSynthesis.cancel();
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [stopCameraStream, settings.language]);
  
  // Effect to manage the camera stream based on user actions
  useEffect(() => {
    if (!isCameraEnabled) {
        stopCameraStream();
        return;
    }

    let didCancel = false;
    const startStream = async () => {
        stopCameraStream(); // Ensure previous stream is stopped

        if (devices.length === 0) return;

        const deviceId = devices[currentDeviceIndex]?.deviceId;
        const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: 1280, height: 720 } };
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (didCancel) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            if (isMounted.current) {
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } else {
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (err) {
             if (isMounted.current) setError("Could not access camera. Please check permissions.");
        }
    };
    
    startStream();

    return () => {
        didCancel = true;
        stopCameraStream();
    };
  }, [isCameraEnabled, currentDeviceIndex, devices, stopCameraStream]);


  // Frame capture interval
  useEffect(() => {
    if (!isCameraEnabled) return;
    const captureInterval = setInterval(() => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 3 && videoRef.current.videoWidth > 0) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            lastFrameRef.current = canvas.toDataURL('image/jpeg', 0.7);
        }
    }, 1000); // Capture a frame every second

    return () => clearInterval(captureInterval);
  }, [isCameraEnabled]);
   
  const startListening = useCallback(() => {
      if (!isMounted.current || !recognitionRef.current || status === 'listening') return;
      setError(null);
      finalTranscriptRef.current = '';
      if(isMounted.current) setCurrentUserTranscript('');
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      
      try {
          recognitionRef.current.start();
          if (isMounted.current) setStatus('listening');
      } catch (e) {
          console.error("Recognition start failed:", e);
          if (isMounted.current) {
              setError("Couldn't start listening. Check mic permissions.");
              setStatus('idle');
          }
      }
  }, [status]);

  const speakResponse = useCallback((text: string) => {
    if(!isMounted.current || !text) {
        if(isMounted.current) setStatus('idle');
        return;
    }
    setHighlightedWordIndex(-1);
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (settings.aiVoiceURI) {
        const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === settings.aiVoiceURI);
        if (voice) utterance.voice = voice;
    }
    utterance.rate = settings.aiSpeed;
    utterance.pitch = settings.aiPitch;
    utterance.lang = settings.language;

    utterance.onboundary = (event) => {
        if(event.name === 'word') {
            const words = text.substring(0, event.charIndex + event.charLength).split(/\s+/);
            if(isMounted.current) setHighlightedWordIndex(words.length - 1);
        }
    };

    utterance.onend = () => {
        if(isMounted.current) {
            setTranscriptHistory(prev => [...prev, { id: uuidv4(), speaker: 'ai', text }]);
            setCurrentAiResponse('');
            setHighlightedWordIndex(-1);
            setStatus('idle');
        }
    };
    window.speechSynthesis.speak(utterance);
  }, [settings.aiPitch, settings.aiSpeed, settings.aiVoiceURI, settings.language]);
  
  useEffect(() => {
    if (status === 'speaking' && currentAiResponse) {
      speakResponse(currentAiResponse);
    }
  }, [status, currentAiResponse, speakResponse]);

  // Auto-scroll effect
  useEffect(() => {
    if (aiTranscriptRef.current) {
        aiTranscriptRef.current.scrollTop = aiTranscriptRef.current.scrollHeight;
    }
    if (userTranscriptRef.current) {
        userTranscriptRef.current.scrollTop = userTranscriptRef.current.scrollHeight;
    }
    if (mobileTranscriptRef.current) {
        mobileTranscriptRef.current.scrollTop = mobileTranscriptRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentUserTranscript, currentAiResponse]);

  const handleInterrupt = () => {
      window.speechSynthesis.cancel();
      if (isMounted.current) {
          setTranscriptHistory(prev => [...prev, { id: uuidv4(), speaker: 'ai', text: currentAiResponse }]);
          setCurrentAiResponse('');
          setStatus('idle');
      }
  };

  const handleOrbClick = () => {
      if (status === 'speaking') {
          handleInterrupt();
          return;
      }
      
      if (status === 'listening') {
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
          recognitionRef.current.stop();
      } else {
          startListening();
      }
  };

  const handleSwitchCamera = () => {
      if (devices.length > 1) {
          setCurrentDeviceIndex(prev => (prev + 1) % devices.length);
      }
  };

  const currentAiResponseWords = currentAiResponse ? currentAiResponse.split(/\s+/) : [];
  
  // Combined transcript for mobile view
  const combinedTranscript = [
      ...transcriptHistory,
      currentUserTranscript ? { id: 'current_user', speaker: 'user', text: currentUserTranscript, isInterim: true } : null,
      (status === 'thinking' || status === 'speaking') ? { id: 'current_ai', speaker: 'ai', text: currentAiResponse, isThinking: status === 'thinking', words: currentAiResponseWords } : null
  ].filter(Boolean);

  const isAiActive = status === 'thinking' || status === 'speaking';

  return createPortal(
    <div className="fixed inset-0 bg-background-darkest/95 backdrop-blur-lg z-50 flex flex-col p-4 text-white animate-fade-in">
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute top-6 right-6 flex gap-2 sm:gap-4 z-[60]">
            {devices.length > 1 &&
              <Button onClick={handleSwitchCamera} variant="secondary" size="sm" className="p-2 aspect-square">
                  <RotateCameraIcon />
              </Button>
            }
            <Button onClick={() => setIsCameraEnabled(p => !p)} variant="secondary" size="sm">
                Vision: {isCameraEnabled ? 'ON' : 'OFF'}
            </Button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-4xl font-light">&times;</button>
        </div>
        
        {/* Camera View Area */}
        <div className="w-full flex justify-center py-2 flex-shrink-0">
            <div className="relative w-full max-w-xl aspect-video rounded-lg overflow-hidden bg-background-dark shadow-lg">
                {isCameraEnabled && <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />}
                {!isCameraEnabled && <div className="w-full h-full flex items-center justify-center text-text-secondary">Camera Off</div>}
            </div>
        </div>
        
        {/* Transcript Area */}
        <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-end md:justify-between p-2 md:p-4 gap-4 min-h-0">
            {/* Mobile: Single interleaved view */}
            <div ref={mobileTranscriptRef} className="md:hidden w-full h-full overflow-y-auto custom-scrollbar space-y-4">
                {combinedTranscript.map((turn: any) => (
                    <div key={turn.id} className={`flex items-start gap-2 ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {turn.speaker === 'ai' && <div className="w-6 h-6 rounded-full bg-surface flex-shrink-0 mt-1" />}
                       <div className={`rounded-lg p-3 max-w-[80%] ${turn.speaker === 'user' ? 'bg-brand-primary/20' : 'bg-surface'} ${turn.id === 'current_ai' && isAiActive ? 'animate-pulse-bg' : ''}`}>
                           {turn.isThinking ? <TypingIndicator/> : (
                               <p className={`text-sm leading-relaxed ${turn.isInterim ? 'italic text-text-secondary' : ''}`}>
                                  {turn.speaker === 'ai' && turn.words ? turn.words.map((word:string, index:number) => (
                                     <span key={index} className={index === highlightedWordIndex ? 'highlighted-word' : ''}>{word} </span>
                                  )) : turn.text}
                               </p>
                           )}
                       </div>
                       {turn.speaker === 'user' && <div className="w-6 h-6 rounded-full bg-brand-primary flex-shrink-0 mt-1" />}
                    </div>
                ))}
            </div>

            {/* Desktop: AI Response (Left) */}
            <div className={`hidden md:flex w-full max-w-sm h-full max-h-[60%] bg-surface/80 backdrop-blur-sm rounded-lg p-2 flex-col gap-1 shadow-2xl transition-all duration-300 ${isAiActive ? 'ring-2 ring-brand-secondary/50 ring-offset-2 ring-offset-background-darkest' : ''}`}>
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider px-2 flex-shrink-0">AI Response</h3>
                <div ref={aiTranscriptRef} className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar p-2 min-h-0">
                    {transcriptHistory.filter(t => t.speaker === 'ai').map(turn => (
                        <div key={turn.id} className="p-3 rounded-lg bg-surface text-left max-w-full">
                            <p className="text-sm leading-relaxed">{turn.text}</p>
                        </div>
                    ))}
                    {status === 'thinking' && <TypingIndicator />}
                    {status === 'speaking' && currentAiResponse && (
                         <div className="p-3 rounded-lg bg-brand-secondary/20 text-left">
                            <p className="text-sm leading-relaxed">
                                {currentAiResponseWords.map((word, index) => (
                                    <span key={index} className={index === highlightedWordIndex ? 'highlighted-word' : ''}>{word} </span>
                                ))}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Desktop: User Transcript (Right) */}
            <div className="hidden md:flex w-full max-w-sm h-full max-h-[60%] bg-surface/80 backdrop-blur-sm rounded-lg p-2 flex-col gap-1 shadow-2xl">
                 <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider text-right px-2 flex-shrink-0">Your Transcript</h3>
                 <div ref={userTranscriptRef} className="flex-1 flex flex-col items-end gap-3 overflow-y-auto pl-2 custom-scrollbar p-2 min-h-0">
                     {transcriptHistory.filter(t => t.speaker === 'user').map(turn => (
                        <div key={turn.id} className="p-3 rounded-lg bg-brand-primary/20 text-right self-end max-w-full">
                            <p className="text-sm leading-relaxed">{turn.text}</p>
                        </div>
                    ))}
                    {currentUserTranscript && (
                         <div className="p-3 rounded-lg bg-brand-primary/20 text-right self-end max-w-full">
                            <p className="text-sm leading-relaxed italic text-text-secondary">{currentUserTranscript}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex-shrink-0 w-full flex flex-col items-center justify-end h-36 pt-4">
            <div className="relative flex items-center justify-center h-24">
                <button onClick={handleOrbClick} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${statusConfig[status].color}`}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                        <path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" />
                    </svg>
                </button>
                {status === 'speaking' && (
                    <Button onClick={handleInterrupt} variant="secondary" size="sm" className="absolute left-full ml-4">Interrupt</Button>
                )}
            </div>
            <p className="mt-4 text-text-secondary">{error || statusConfig[status].text}</p>
        </div>
         <style>{`
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
          .highlighted-word { background-color: var(--brand-secondary); color: var(--background-darkest); padding: 0px 2px; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--overlay); }
          @keyframes pulse-bg-animation {
            0%, 100% { background-color: var(--surface); }
            50% { background-color: var(--overlay); }
          }
          .animate-pulse-bg {
            animation: pulse-bg-animation 2s ease-in-out infinite;
          }
        `}</style>
    </div>,
    document.body
  );
};