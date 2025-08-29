// FIX: Add type definitions for the Web Speech API to resolve TypeScript errors.
// These are not included in the standard DOM typings.
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      }
    }
  }
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Chat, type Part } from "@google/genai";
import { Message, MessageRole, AppMode, MessageType, Quiz } from './types';
import { startChat, generateStudyGuide, generateQuiz } from './services/geminiService';
import Header from './components/Header';
import { ChatInput } from './components/ChatInput';
import { MessageRenderer } from './components/ChatMessage';
import { TypingIndicator } from './components/TypingIndicator';
import { QuizView } from './components/QuizView';

// Helper function to convert a File to a base64 string for the Gemini API
async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: base64EncodedData, mimeType: file.type } };
}

// Helper function to convert a File to a data URL for display
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: MessageRole.MODEL,
      type: MessageType.CHAT,
      text: "Hello! I'm Snipestudy. Select a mode below to get started.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  
  // Live mode state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      chatRef.current = startChat();
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: MessageRole.MODEL, type: MessageType.ERROR, text: "Failed to initialize AI Chat. Please check your API Key."}]);
    }
    
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };
      recognitionRef.current = recognition;
    }

  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeQuiz]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = useCallback(async (userInput: string, imageFile?: File) => {
    if (!userInput.trim() && !imageFile) return;

    setIsLoading(true);

    let userImageForState: string | undefined;
    if (imageFile) {
        try {
            userImageForState = await fileToDataUrl(imageFile);
        } catch(e) {
            console.error(e);
            setMessages(prev => [...prev, {role: MessageRole.MODEL, type: MessageType.ERROR, text: "Failed to read image file."}]);
            setIsLoading(false);
            return;
        }
    }
    
    const userMessage: Message = { role: MessageRole.USER, type: MessageType.CHAT, text: userInput, image: userImageForState };
    setMessages(prev => [...prev, userMessage]);

    try {
        switch (currentMode) {
            case AppMode.STUDY_GUIDE:
                const guide = await generateStudyGuide(userInput);
                setMessages(prev => [...prev, { role: MessageRole.MODEL, type: MessageType.STUDY_GUIDE_RESULT, text: guide }]);
                break;
            case AppMode.QUIZ:
                const quizData = await generateQuiz(userInput);
                setActiveQuiz({ topic: userInput, questions: quizData.questions });
                break;
            case AppMode.CHAT:
            case AppMode.LIVE:
                if (!chatRef.current) {
                    setMessages(prev => [...prev, {role: MessageRole.MODEL, type: MessageType.ERROR, text: "Chat is not initialized."}]);
                    return;
                }
                const messageParts: (string | Part)[] = [userInput];
                if (imageFile) {
                    const imagePart = await fileToGenerativePart(imageFile);
                    messageParts.push(imagePart);
                }
                const result = await chatRef.current.sendMessageStream({ message: messageParts });
                
                let modelResponse = '';
                setMessages(prev => [...prev, { role: MessageRole.MODEL, type: MessageType.CHAT, text: '' }]);

                for await (const chunk of result) {
                    modelResponse += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].text = modelResponse;
                        return newMessages;
                    });
                }

                if (currentMode === AppMode.LIVE) {
                  speak(modelResponse);
                }
                break;
        }
    } catch (e: any) {
        console.error(e);
        const errorMessage = "Sorry, something went wrong. Please try again.";
        setMessages(prev => [...prev, { role: MessageRole.MODEL, type: MessageType.ERROR, text: errorMessage }]);
    } finally {
        setIsLoading(false);
    }
  }, [currentMode]);
  
  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleQuizComplete = (score: number, total: number) => {
    setMessages(prev => [...prev, {
      role: MessageRole.MODEL,
      type: MessageType.QUIZ_RESULT,
      text: `Quiz on "${activeQuiz?.topic}" complete!`,
      quizScore: { score, total }
    }]);
    setActiveQuiz(null);
  };


  return (
    <div className="flex flex-col h-screen bg-background-dark text-white font-sans">
      <Header />
      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {activeQuiz ? (
            <QuizView quiz={activeQuiz} onQuizComplete={handleQuizComplete} />
          ) : (
            <>
              {messages.map((msg, index) => (
                <MessageRenderer key={index} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
        </div>
      </main>
      {!activeQuiz && (
         <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
            currentMode={currentMode}
            setCurrentMode={setCurrentMode}
            isListening={isListening}
            onMicClick={handleMicClick}
          />
      )}
    </div>
  );
};

export default App;
