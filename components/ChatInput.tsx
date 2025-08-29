import React, { useState, useRef } from 'react';
import { AppMode } from '../types';
import { ModeSelector } from './ModeSelector';

interface ChatInputProps {
  onSendMessage: (message: string, image?: File) => void;
  isLoading: boolean;
  currentMode: AppMode;
  setCurrentMode: (mode: AppMode) => void;
  isListening: boolean;
  onMicClick: () => void;
}

const AttachIcon: React.FC<{ disabled: boolean }> = ({ disabled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" 
        className={`h-6 w-6 ${disabled ? 'text-gray-600' : 'text-gray-400'}`} 
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const SendIcon: React.FC<{ disabled: boolean }> = ({ disabled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" 
        className={`h-6 w-6 transform rotate-90 ${disabled ? 'text-gray-500' : 'text-brand-secondary'}`} 
        fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const MicIcon: React.FC<{ isListening: boolean }> = ({ isListening }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-white ${isListening ? 'animate-pulse' : ''}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 10.5a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5h-.5a.5.5 0 01-.5-.5v-.5zM9 15a.5.5 0 00-.5.5v.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5v-.5a.5.5 0 00-.5-.5h-.5zM7 15a.5.5 0 00-.5.5v.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5v-.5a.5.5 0 00-.5-.5h-.5zM5 10a.5.5 0 01.5-.5h.5a.5.5 0 01.5.5v4.5a.5.5 0 01-.5.5h-.5a.5.5 0 01-.5-.5V10zM15 10a.5.5 0 00-.5.5v4.5a.5.5 0 00.5.5h.5a.5.5 0 00.5-.5V10a.5.5 0 00-.5-.5h-.5zM10 18a5 5 0 005-5h-1a4 4 0 01-8 0H5a5 5 0 005 5z" clipRule="evenodd" />
  </svg>
);


export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, currentMode, setCurrentMode, isListening, onMicClick }) => {
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholderText: { [key in AppMode]: string } = {
    [AppMode.CHAT]: "Ask a study question...",
    [AppMode.STUDY_GUIDE]: "Topic for your study guide...",
    [AppMode.QUIZ]: "Topic for your quiz...",
    [AppMode.LIVE]: isListening ? "Listening..." : "Tap the mic to speak",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleRemoveImage = () => {
      setImageFile(null);
      setImagePreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || imageFile) && !isLoading) {
      onSendMessage(input.trim(), imageFile ?? undefined);
      setInput('');
      handleRemoveImage();
    }
  };

  return (
    <div className="bg-background-light pt-2 pb-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-2">
            <ModeSelector currentMode={currentMode} onModeChange={setCurrentMode} disabled={isLoading} />
            {imagePreview && currentMode === AppMode.CHAT && (
                <div className="relative w-max mx-auto mb-2">
                    <div className="relative bg-background-dark p-1.5 rounded-lg shadow-lg">
                        <img src={imagePreview} alt="Selected preview" className="h-20 w-20 object-cover rounded" />
                        <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold focus:outline-none"
                            aria-label="Remove image"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
            
            {currentMode === AppMode.LIVE ? (
                <div className="flex flex-col items-center justify-center h-24">
                  <button onClick={onMicClick} disabled={isLoading} className={`bg-brand-secondary rounded-full p-5 transition-transform duration-200 ${isListening ? 'scale-110' : 'scale-100'} ${isLoading && !isListening ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <MicIcon isListening={isListening} />
                  </button>
                  <p className="text-gray-400 mt-2 text-sm">{placeholderText[AppMode.LIVE]}</p>
                </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                  {currentMode === AppMode.CHAT && (
                      <>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden"/>
                          <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isLoading}
                              className="p-3 rounded-full hover:bg-gray-700 disabled:opacity-50 transition-colors"
                              aria-label="Attach image"
                          >
                              <AttachIcon disabled={isLoading} />
                          </button>
                      </>
                  )}
                  <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={placeholderText[currentMode]}
                      disabled={isLoading}
                      className="flex-1 bg-background-dark border border-gray-600 rounded-full py-3 px-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-secondary disabled:opacity-50"
                  />
                  <button
                      type="submit"
                      disabled={isLoading || (!input.trim() && (currentMode !== AppMode.CHAT || !imageFile))}
                      className="bg-background-dark p-3 rounded-full hover:bg-gray-700 disabled:hover:bg-background-dark disabled:cursor-not-allowed transition-colors"
                  >
                      <SendIcon disabled={isLoading || (!input.trim() && (currentMode !== AppMode.CHAT || !imageFile))} />
                  </button>
              </form>
            )}
        </div>
    </div>
  );
};