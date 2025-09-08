
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CameraView } from './CameraView';

interface ChatInputProps {
  onSendMessage: (message: string, image?: File) => void;
  isLoading: boolean;
  placeholder: string;
  onStopGeneration: () => void;
  isWebSearchMode: boolean;
  onToggleWebSearchMode: () => void;
}

const AttachIcon: React.FC<{ disabled: boolean }> = ({ disabled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${disabled ? 'text-gray-600' : 'text-text-secondary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
);

const CameraIcon: React.FC<{ disabled: boolean }> = ({ disabled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${disabled ? 'text-gray-600' : 'text-text-secondary'}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H4zm10 4a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
    </svg>
);

const MicIcon: React.FC<{ disabled: boolean; isListening: boolean }> = ({ disabled, isListening }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${disabled ? 'text-gray-600' : isListening ? 'text-red-500' : 'text-text-secondary'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
        <path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" />
    </svg>
);

const SendIcon: React.FC<{ disabled: boolean }> = ({ disabled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform rotate-90 ${disabled ? 'text-text-secondary' : 'text-brand-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
);

const StopIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
);

const agentCommands = [
  { command: 'search', description: 'Perform a web search' },
  { command: 'flashcards', description: 'Generate flashcards from a topic' },
  { command: 'summarize', description: 'Summarize the text that follows' },
];

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, placeholder, onStopGeneration, isWebSearchMode, onToggleWebSearchMode }) => {
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (input.length > 0 && !input.includes(' ')) {
        setShowCommandSuggestions(true);
    } else {
        setShowCommandSuggestions(false);
    }
  }, [input]);

   useEffect(() => {
    if (!isSpeechRecognitionSupported) return;

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => { setImagePreview(reader.result as string); };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveImage = () => {
      setImageFile(null);
      setImagePreview(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageFile) && !isLoading) {
      onSendMessage(input.trim(), imageFile ?? undefined);
      setInput('');
      handleRemoveImage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  
  const handlePhotoTaken = async (dataUrl: string) => {
    setIsCameraOpen(false);
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFile(file);
        setImagePreview(dataUrl);
    } catch (error) {
        console.error("Error converting data URL to file:", error);
    }
  };

  return (
    <div className="bg-background-dark p-2 sm:p-4 flex-shrink-0 border-t border-border-color">
        <div className="max-w-4xl mx-auto relative">
            {showCommandSuggestions && (
                <div className="absolute bottom-full left-0 right-0 bg-background-light rounded-t-lg border border-b-0 border-border-color shadow-lg p-2">
                    {agentCommands
                      .filter(cmd => cmd.command.toLowerCase().includes(input.toLowerCase()))
                      .map(cmd => (
                        <div key={cmd.command}
                             onClick={() => { setInput(cmd.command + ' '); setShowCommandSuggestions(false); textareaRef.current?.focus(); }}
                             className="p-2 hover:bg-background-darkest rounded-md cursor-pointer text-sm">
                            <span className="font-mono font-semibold text-brand-light">{cmd.command}</span>
                            <span className="ml-2 text-text-secondary">{cmd.description}</span>
                        </div>
                    ))}
                </div>
            )}
            {imagePreview && (
                <div className="relative w-max ml-2 mb-2">
                    <div className="relative bg-background-light p-1.5 rounded-lg shadow-lg">
                        <img src={imagePreview} alt="Selected preview" className="h-20 w-20 object-cover rounded" />
                        <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold" aria-label="Remove image">&times;</button>
                    </div>
                </div>
            )}
             <div className="flex items-center justify-end px-2 pb-2">
                <label htmlFor="web-search-toggle" className="text-xs sm:text-sm text-text-secondary mr-2 sm:mr-3 font-medium">Web Search</label>
                <button
                    id="web-search-toggle"
                    onClick={onToggleWebSearchMode}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark ${isWebSearchMode ? 'bg-brand-primary' : 'bg-overlay'}`}
                    aria-pressed={isWebSearchMode}
                >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isWebSearchMode ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="flex items-end space-x-1 sm:space-x-2 bg-background-light rounded-xl p-1.5 sm:p-2 border border-border-color focus-within:border-brand-primary transition-colors">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-2 rounded-lg hover:bg-background-darkest disabled:opacity-50" aria-label="Attach image">
                    <AttachIcon disabled={isLoading} />
                </button>
                <button type="button" onClick={() => setIsCameraOpen(true)} disabled={isLoading} className="p-2 rounded-lg hover:bg-background-darkest disabled:opacity-50" aria-label="Use camera">
                    <CameraIcon disabled={isLoading} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={input} 
                  onChange={handleInputChange} 
                  placeholder={placeholder} 
                  disabled={isLoading} 
                  rows={1}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSubmit(e); } }}
                  className="flex-1 bg-transparent border-none text-text-primary placeholder-text-secondary focus:outline-none focus:ring-0 resize-none max-h-48 disabled:opacity-50 min-w-0" 
                />
                 {isSpeechRecognitionSupported && (
                     <button type="button" onClick={handleToggleListening} disabled={isLoading} className="p-2 rounded-lg hover:bg-background-darkest disabled:opacity-50" aria-label="Use voice input">
                        <MicIcon disabled={isLoading} isListening={isListening}/>
                    </button>
                 )}
                {isLoading ? (
                    <button type="button" onClick={onStopGeneration} className="bg-red-600 p-2.5 rounded-lg hover:bg-red-700 flex items-center justify-center self-center" aria-label="Stop generation">
                        <StopIcon />
                    </button>
                ) : (
                    <button type="submit" disabled={!input.trim() && !imageFile} className="p-2 rounded-lg hover:bg-background-darkest disabled:opacity-50 self-center">
                        <SendIcon disabled={!input.trim() && !imageFile} />
                    </button>
                )}
            </form>
        </div>
        {isCameraOpen && createPortal(
            <CameraView onPhotoTaken={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />,
            document.body
        )}
    </div>
  );
};
