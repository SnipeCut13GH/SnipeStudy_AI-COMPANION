

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CameraView } from './CameraView.tsx';
import { Button } from './common/Button.tsx';
import { Tooltip } from './common/Tooltip.tsx';
import { AppSettings } from '../App.tsx';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string, imageFile?: File) => void;
  isLoading: boolean;
  placeholder: string;
  onStopGeneration: () => void;
  settings: AppSettings;
  t: (key: string) => string;
}

// --- ICONS ---
const AttachIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
);
const CameraIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm10 4a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" /></svg>
);
const SendIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
);
const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z" clipRule="evenodd" /></svg>
);
const MicIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" /></svg>
);


// --- MAIN COMPONENT ---
export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, placeholder, onStopGeneration, settings, t }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechSupport, setSpeechSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textBeforeListeningRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupport(true);
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setText(textBeforeListeningRef.current ? `${textBeforeListeningRef.current} ${transcript}`.trim() : transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone permission denied. Please enable it in your browser settings.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
      };
    }
  }, [settings.language]);

  useEffect(() => {
    if (textAreaRef.current) {
        const target = textAreaRef.current;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((!text.trim() && !imageFile) || isLoading) return;
    onSendMessage(text.trim(), imageFile || undefined);
    setText('');
    setImageFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
    if(e.target) e.target.value = ''; // Reset file input
  };
  
  const handlePhotoTaken = (dataUrl: string) => {
    fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImageFile(file);
            setIsCameraOpen(false);
        });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      textBeforeListeningRef.current = text;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex-shrink-0 p-2 sm:p-4 bg-surface border-t border-border-color">
      <div className="w-full bg-background-light rounded-xl p-2 flex items-end gap-2">
        <div className="flex items-center self-end gap-1">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <Tooltip content={t('chatInput.attachImage')}>
                <Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="p-2" disabled={isLoading}><AttachIcon /></Button>
            </Tooltip>
            <Tooltip content={t('chatInput.useCamera')}>
                <Button onClick={() => setIsCameraOpen(true)} variant="ghost" size="sm" className="p-2" disabled={isLoading}><CameraIcon /></Button>
            </Tooltip>
        </div>
        
        {imageFile && (
          <div className="relative mb-1 self-end">
            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-16 h-16 object-cover rounded-md" />
            <button onClick={() => setImageFile(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">&times;</button>
          </div>
        )}
        
        <textarea
          ref={textAreaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? t('chatInput.listening') : placeholder}
          rows={1}
          className="flex-1 bg-transparent text-text-primary placeholder-text-secondary focus:outline-none resize-none max-h-40"
          style={{ lineHeight: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
          disabled={isLoading}
        />

        <div className="flex items-end self-end gap-1">
            <Tooltip content={!speechSupport ? t('chatInput.speechNotSupported') : (isListening ? t('chatInput.stopListening') : t('chatInput.speechToText'))}>
              <Button 
                onClick={handleMicClick} 
                variant="ghost" 
                size="sm" 
                className={`p-2 relative aspect-square h-10 w-10 ${isListening ? 'text-brand-primary' : ''}`} 
                disabled={isLoading || !speechSupport}
              >
                {isListening && <span className="absolute inset-0 rounded-full bg-brand-primary/20 animate-ping"></span>}
                <MicIcon />
              </Button>
            </Tooltip>

            {isLoading ? (
                <Button onClick={onStopGeneration} variant="danger" size="sm" className="p-2 aspect-square h-10 w-10">
                    <StopIcon />
                </Button>
            ) : (
                <Button onClick={handleSend} disabled={!text.trim() && !imageFile} size="sm" className="p-2 aspect-square h-10 w-10">
                    <SendIcon />
                </Button>
            )}
        </div>
      </div>
      {isCameraOpen && createPortal(
          <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />,
          document.body
      )}
    </div>
  );
};