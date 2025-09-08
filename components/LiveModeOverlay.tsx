import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as geminiService from '../services/geminiService.ts';
import { AppSettings } from '../../App.tsx';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageRole } from '../types.ts';

interface LiveModeOverlayProps {
  onClose: () => void;
  settings: AppSettings;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const statusConfig = {
    idle: { color: 'bg-brand-primary', text: 'Tap the orb to start speaking.' },
    listening: { color: 'bg-brand-primary orb-listening', text: 'Listening...' },
    thinking: { color: 'bg-yellow-500', text: 'Thinking...' },
    speaking: { color: 'bg-green-500', text: '' },
};

const extractFramesFromVideo = (videoUrl: string, frameCount = 3): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        video.crossOrigin = "anonymous";
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: string[] = [];

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const duration = video.duration;

            if (duration <= 0 || !isFinite(duration) || frameCount <= 1) {
                video.currentTime = 0;
                video.onseeked = () => {
                     if (!context) return reject("Canvas context not available");
                     context.drawImage(video, 0, 0, canvas.width, canvas.height);
                     frames.push(canvas.toDataURL('image/jpeg'));
                     if (frames.length > 0) resolve(frames);
                     else reject("Failed to capture any frames.");
                }
                return;
            }
            
            let capturedFrames = 0;
            const captureFrame = () => {
                if (!context) return reject("Canvas context not available");
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg'));
                capturedFrames++;
                if (capturedFrames >= frameCount) {
                    if (frames.length > 0) resolve(frames);
                    else reject("Failed to capture any frames.");
                } else {
                    const nextTime = duration * (capturedFrames / (frameCount - 1));
                    video.currentTime = nextTime;
                }
            };
            
            video.onseeked = captureFrame;
            video.currentTime = 0; // Start at the beginning
        };
        
        video.onerror = (e) => reject("Error loading video for frame extraction.");
        video.load();
    });
};


export const LiveModeOverlay: React.FC<LiveModeOverlayProps> = ({ onClose, settings }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [aiResponse, setAiResponse] = useState('');
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const isMounted = useRef(true);

    const stopAllStreams = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
        isMounted.current = false;
        stopAllStreams();
        if (recognitionRef.current) recognitionRef.current.abort();
        window.speechSynthesis.cancel();
    };
  }, [stopAllStreams]);

   useEffect(() => {
    // Automatically enable video when Live Mode opens
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(s => { if(isMounted.current) { setStream(s); if(videoRef.current) videoRef.current.srcObject = s; }})
      .catch(() => { if(isMounted.current) setError("Could not access camera. Please check permissions."); });
   }, []);
   
  const processTranscript = useCallback(async (transcript: string, videoBlob: Blob | null) => {
    if (!transcript.trim() && !videoBlob) {
        if(isMounted.current) setStatus('idle');
        return;
    }
    if(isMounted.current) {
        setStatus('thinking');
        setAiResponse('');
    }
    
    try {
        let frames: string[] = [];
        if(videoBlob) {
            const url = URL.createObjectURL(videoBlob);
            frames = await extractFramesFromVideo(url, 3);
            URL.revokeObjectURL(url);
        }

        const userMessage: Message = {
            id: uuidv4(),
            role: MessageRole.USER,
            text: transcript,
            images: frames.length > 0 ? frames : undefined,
        };
        const { text } = await geminiService.generateChatResponse([userMessage], settings.systemInstruction);
        if(isMounted.current) {
            setAiResponse(text);
            // Fix: Instead of calling speakResponse directly and causing a circular dependency,
            // set the status to 'speaking'. A useEffect will then pick this up and call speakResponse.
            setStatus('speaking');
        }
    } catch (apiError) {
        console.error("Live Mode API error:", apiError);
        const errorMessage = "Sorry, I encountered an error.";
        if(isMounted.current) {
            setError(errorMessage);
            setStatus('idle');
        }
    }
  }, [settings.systemInstruction]);
  
  const startListening = useCallback(() => {
      if (!isMounted.current) return;
      setError(null);
      try {
          recognitionRef.current.start();
          setStatus('listening');
          if (stream) {
              recordedChunksRef.current = [];
              const recorderOptions = { mimeType: 'video/webm' };
              const recorder = MediaRecorder.isTypeSupported(recorderOptions.mimeType) 
                  ? new MediaRecorder(stream, recorderOptions)
                  : new MediaRecorder(stream);
              
              mediaRecorderRef.current = recorder;
              recorder.ondataavailable = (event) => {
                  if (event.data.size > 0) recordedChunksRef.current.push(event.data);
              };
              recorder.onstop = () => {
                  const videoBlob = new Blob(recordedChunksRef.current, { type: recorderOptions.mimeType });
                  processTranscript(finalTranscriptRef.current.trim(), videoBlob);
              };
              recorder.start(1000);
          }
      } catch (e) {
          console.error("Recognition start failed:", e);
          setStatus('idle');
      }
  }, [stream, processTranscript]);

  const speakResponse = useCallback((text: string) => {
    if(!isMounted.current || !text) {
        if(isMounted.current) setStatus('idle');
        return;
    }
    setStatus('speaking');
    setHighlightedWordIndex(-1);
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply voice settings from props
    if (settings.aiVoiceURI) {
        const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === settings.aiVoiceURI);
        if (voice) utterance.voice = voice;
    }
    utterance.rate = settings.aiSpeed;
    utterance.pitch = settings.aiPitch;

    utterance.onboundary = (event) => {
        if(event.name === 'word') {
            const words = text.substring(0, event.charIndex + event.charLength).split(/\s+/);
            if(isMounted.current) setHighlightedWordIndex(words.length - 1);
        }
    };

    utterance.onend = () => {
        if(isMounted.current) {
            setHighlightedWordIndex(-1);
            // Automatically start listening again for a continuous conversation
            startListening();
        }
    };
    window.speechSynthesis.speak(utterance);
  }, [settings, startListening]);
  
  // Fix: This useEffect triggers the speech response when the state is ready, breaking the hook dependency cycle.
  useEffect(() => {
    if (status === 'speaking' && aiResponse) {
      speakResponse(aiResponse);
    }
  }, [status, aiResponse, speakResponse]);

  useEffect(() => {
      if (!SpeechRecognition) {
          setError("Speech recognition is not supported by your browser.");
          return;
      }
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                  final += event.results[i][0].transcript;
              } else {
                  interim += event.results[i][0].transcript;
              }
          }
          if (isMounted.current) setLiveTranscript(finalTranscriptRef.current + interim);
          if (final) finalTranscriptRef.current += final + ' ';
      };

      recognition.onend = () => {
          if (!isMounted.current) return;
          if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
          } else {
              processTranscript(finalTranscriptRef.current.trim(), null);
          }
          finalTranscriptRef.current = '';
          if (isMounted.current) setLiveTranscript('');
      };

      return () => recognition.abort();
  }, [processTranscript]);

  const handleOrbClick = () => {
      // Interrupt speaking and listen immediately
      if (status === 'speaking') {
          window.speechSynthesis.cancel(); // onend will trigger startListening
          return;
      }
      
      // Stop listening and process transcript
      if (status === 'listening') {
          recognitionRef.current.stop();
          setStatus('thinking');
      } else {
          // Start listening from idle state
          startListening();
      }
  };

  const responseWords = aiResponse ? aiResponse.split(/\s+/) : [];
  
  return createPortal(
    <div className="fixed inset-0 bg-background-darkest/95 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-4 text-white animate-fade-in">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/70 hover:text-white text-4xl font-light">&times;</button>
        
        <div className="w-full flex-1 flex flex-col items-center justify-center relative">
            {stream && (
                 <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-20" />
            )}
             <div className="text-center max-w-4xl">
                 {status === 'speaking' ? (
                     <p className="text-4xl font-bold leading-tight">
                         {responseWords.map((word, index) => (
                             <span key={index} className={index === highlightedWordIndex ? 'highlighted-word' : ''}>{word} </span>
                         ))}
                     </p>
                 ) : (
                     <p className="text-2xl text-text-secondary min-h-[3rem]">{liveTranscript}</p>
                 )}
            </div>
        </div>
        
        <div className="flex-shrink-0 w-full flex flex-col items-center justify-end h-1/3">
            <button onClick={handleOrbClick} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${statusConfig[status].color}`}>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                    <path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" />
                </svg>
            </button>
            <p className="mt-4 text-text-secondary">{error || statusConfig[status].text}</p>
        </div>
         <style>{`
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}</style>
    </div>,
    document.body
  );
};