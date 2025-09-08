

import React from 'react';
import { Project, ToolType, FlashcardDeck } from '../../types';
import { QuizView } from '../QuizView';
import { StoryViewer } from '../StoryViewer';
import { MindMapView } from '../MindMapView';
import { CodeModeView } from '../tools/CodeRunnerView';
import { FlashcardView } from '../tools/FlashcardView';
import { AudioTranscriberView } from '../tools/AudioTranscriberView';
import { PresentationView } from '../tools/PresentationView';
import { KanbanView } from '../tools/KanbanView';
import { CalendarView } from '../tools/CalendarView';
import { ImageEditorView } from '../ImageEditorView';
import { SmartboardView } from '../tools/SmartboardView';
import { VideoGeneratorView } from '../tools/VideoGeneratorView';
// Fix: Import WhiteboardView and DocsView to render the corresponding tools.
import { WhiteboardView } from '../tools/WhiteboardView.tsx';
import { DocsView } from '../tools/DocsView.tsx';
import { MessageList } from '../ChatMessage';
import { ChatInput } from '../ChatInput';
import { Message, MessageRole } from '../../types';
import * as geminiService from '../../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings } from '../../App.tsx';

interface ProjectDashboardProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  activeTool: ToolType;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  settings: AppSettings;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
    project, onUpdateProject, activeTool, messages, setMessages, settings
}) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [isWebSearchMode, setIsWebSearchMode] = React.useState(false);
    const bottomRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (prompt: string, imageFile?: File) => {
        setIsLoading(true);

        let imageBase64: string | undefined = undefined;
        if (imageFile) {
            imageBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(imageFile);
            });
        }

        const userMessage: Message = {
            id: uuidv4(),
            role: MessageRole.USER,
            text: prompt,
            images: imageBase64 ? [imageBase64] : undefined,
        };
        
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        try {
            const lowerCasePrompt = prompt.toLowerCase();
            // Command handling
            if (lowerCasePrompt.startsWith('flashcards')) {
                const topic = prompt.substring('flashcards'.length).trim();
                if (topic) {
                    const cards = await geminiService.generateFlashcards(topic, 10); // default 10 cards
                    const newDeck: FlashcardDeck = { id: uuidv4(), title: topic, cards: cards.map(c => ({...c, id: uuidv4()})) };
                    
                    const flashcardData = project.tools.flashcards || { decks: {} };
                    const updatedDecks = { ...flashcardData.decks, [newDeck.id]: newDeck };
                    
                    onUpdateProject({ ...project, tools: { ...project.tools, flashcards: { decks: updatedDecks }}});
                    
                    const modelMessage: Message = {
                        id: uuidv4(),
                        role: MessageRole.MODEL,
                        text: `I've created a new flashcard deck for you on "${topic}". You can find it in the Flashcards tool.`,
                        flashcardDeckId: newDeck.id,
                    };
                    setMessages(prev => [...prev, modelMessage]);
                } else {
                     throw new Error("Please provide a topic for the flashcards. Usage: flashcards [topic]");
                }
            } else if (lowerCasePrompt.startsWith('summarize')) {
                const textToSummarize = prompt.substring('summarize'.length).trim();
                if (textToSummarize) {
                    const summary = await geminiService.summarizeText(textToSummarize);
                    const modelMessage: Message = { id: uuidv4(), role: MessageRole.MODEL, text: summary };
                    setMessages(prev => [...prev, modelMessage]);
                } else {
                    throw new Error("Please provide text to summarize. Usage: summarize [text to summarize]");
                }
            } else {
                 // Default chat response
                let messagesForApi = updatedMessages;
                const lastMessage = messagesForApi[messagesForApi.length - 1];

                const shouldSearch = isWebSearchMode || lastMessage.text.toLowerCase().startsWith('search');
                
                if (lastMessage.text.toLowerCase().startsWith('search')) {
                    const modifiedLastMessage = { ...lastMessage, text: lastMessage.text.substring('search'.length).trim() };
                    messagesForApi = [...messagesForApi.slice(0, -1), modifiedLastMessage];
                }

                const { text, sources } = await geminiService.generateChatResponse(messagesForApi, settings.systemInstruction, shouldSearch);
                const modelMessage: Message = {
                    id: uuidv4(),
                    role: MessageRole.MODEL,
                    text,
                    sources,
                };
                setMessages(prev => [...prev, modelMessage]);
            }
        } catch (error: any) {
            const errorMessage: Message = {
                id: uuidv4(),
                role: MessageRole.MODEL,
                text: error.message || "An unknown error occurred.",
                isError: true,
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
  
    const toolComponentMap: Record<ToolType, React.ReactNode> = {
        'chat': (
            <div className="flex flex-col h-full bg-background-darkest">
                <MessageList messages={messages} isLoading={isLoading} bottomRef={bottomRef} />
                <ChatInput 
                    onSendMessage={handleSendMessage} 
                    isLoading={isLoading} 
                    placeholder="Ask anything or type a command..."
                    onStopGeneration={() => console.log('Stop generation not implemented')}
                    isWebSearchMode={isWebSearchMode}
                    onToggleWebSearchMode={() => setIsWebSearchMode(p => !p)}
                />
            </div>
        ),
        'quiz': <QuizView project={project} onUpdateProject={onUpdateProject} />,
        'story': <StoryViewer project={project} onUpdateProject={onUpdateProject} />,
        'mind_map': <MindMapView project={project} onUpdateProject={onUpdateProject} />,
        'code_mode': <CodeModeView project={project} onUpdateProject={onUpdateProject} />,
        'flashcards': <FlashcardView project={project} onUpdateProject={onUpdateProject} />,
        'audio_transcription': <AudioTranscriberView project={project} onUpdateProject={onUpdateProject} />,
        'presentation': <PresentationView project={project} onUpdateProject={onUpdateProject} />,
        'kanban': <KanbanView project={project} onUpdateProject={onUpdateProject} />,
        'calendar': <CalendarView project={project} onUpdateProject={onUpdateProject} />,
        'image_editor': <ImageEditorView project={project} onUpdateProject={onUpdateProject} />,
        'smartboard': <SmartboardView project={project} onUpdateProject={onUpdateProject} />,
        'video_generator': <VideoGeneratorView project={project} onUpdateProject={onUpdateProject} />,
        'whiteboard': <WhiteboardView project={project} onUpdateProject={onUpdateProject} />,
        'docs': <DocsView project={project} onUpdateProject={onUpdateProject} />,
    };

    return (
      <div className="w-full h-full relative">
        {Object.entries(toolComponentMap).map(([tool, component]) => (
          <div
            key={tool}
            className="w-full h-full"
            style={{ display: activeTool === tool ? 'block' : 'none' }}
          >
            {component}
          </div>
        ))}
      </div>
    );
};