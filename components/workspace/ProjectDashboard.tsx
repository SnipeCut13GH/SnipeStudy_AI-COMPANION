import React from 'react';
import { Project, ToolType, ChatSession } from '../../types.ts';
import { QuizView } from '../QuizView.tsx';
import { StoryViewer } from '../StoryViewer.tsx';
import { MindMapView } from '../MindMapView.tsx';
import { CodeModeView } from '../tools/CodeRunnerView.tsx';
import { FlashcardView } from '../tools/FlashcardView.tsx';
import { AudioTranscriberView } from '../tools/AudioTranscriberView.tsx';
import { PresentationView } from '../tools/PresentationView.tsx';
import { KanbanView } from '../tools/KanbanView.tsx';
import { CalendarView } from '../tools/CalendarView.tsx';
import { ImageEditorView } from '../ImageEditorView.tsx';
import { SmartboardView } from '../tools/SmartboardView.tsx';
import { DocsView } from '../tools/DocsView.tsx';
import { GamesView } from '../tools/GamesView.tsx';
// Fix: Import VideoGeneratorView to be able to use it in the dashboard.
import { VideoGeneratorView } from '../tools/VideoGeneratorView.tsx';
import { MessageList } from '../ChatMessage.tsx';
import { ChatInput } from '../ChatInput.tsx';
import { Message, MessageRole } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings } from '../../App.tsx';
import { languages } from '../../services/translations.ts';
import { getTranslator } from '../../services/translator.ts';
import { Tooltip } from '../common/Tooltip.tsx';


// --- Main Project Dashboard Component ---
interface ProjectDashboardProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  activeTool: ToolType;
  settings: AppSettings;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
    project, onUpdateProject, activeTool, settings
}) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const bottomRef = React.useRef<HTMLDivElement>(null);
    const stopGenerationRef = React.useRef(false);
    const { t } = getTranslator(settings.language);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [project.tools.chat?.activeSessionId, project.tools.chat?.sessions, isLoading]);
    
    const handleStopGeneration = () => {
        stopGenerationRef.current = true;
        setIsLoading(false);
    };

    const handleSendMessage = async (prompt: string, imageFile?: File) => {
        stopGenerationRef.current = false;
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
        
        const userMessage: Message = { id: uuidv4(), role: MessageRole.USER, text: prompt, images: imageBase64 ? [imageBase64] : undefined };
        
        const activeSessionId = project.tools.chat?.activeSessionId;
        if (!activeSessionId) {
            setIsLoading(false);
            console.error("No active chat session found.");
            return;
        }
        const activeSession = project.tools.chat!.sessions[activeSessionId];
        const historyForApi = [...activeSession.messages, userMessage];

        // Optimistic UI update for user message
        onUpdateProject(currentProject => {
            const chatData = currentProject.tools.chat;
            if (!chatData || !chatData.activeSessionId) return currentProject;
            
            const currentActiveSession = chatData.sessions[chatData.activeSessionId];
            const newTitle = currentActiveSession.messages.length === 0 && prompt.trim() ? prompt.substring(0, 40) : currentActiveSession.title;
            const sessionWithUserMessage: ChatSession = { 
                ...currentActiveSession, 
                title: newTitle, 
                messages: [...currentActiveSession.messages, userMessage] 
            };

            return {
                ...currentProject,
                tools: {
                    ...currentProject.tools,
                    chat: {
                        ...chatData,
                        sessions: { ...chatData.sessions, [currentActiveSession.id]: sessionWithUserMessage }
                    }
                }
            };
        });
        
        const languageName = languages[settings.language as keyof typeof languages] || 'English';
        const finalSystemInstruction = `You must respond in ${languageName}. ${settings.systemInstruction}`;
        
        try {
            const { text, sources } = await geminiService.generateChatResponse(historyForApi, finalSystemInstruction, true);
            
            if (stopGenerationRef.current) return;

            const modelMessage: Message = { 
                id: uuidv4(), 
                role: MessageRole.MODEL, 
                text, 
                sources,
                primarySource: (sources && sources.length > 0) ? sources[0] : undefined,
            };
            
            onUpdateProject(currentProject => {
                const chatData = currentProject.tools.chat;
                if (!chatData || !chatData.activeSessionId) return currentProject;
                
                const currentActiveSession = chatData.sessions[chatData.activeSessionId];
                // Ensure we're updating the correct message history
                const messagesWithModelResponse = [...currentActiveSession.messages, modelMessage];

                const sessionWithModelMessage = { 
                    ...currentActiveSession, 
                    messages: messagesWithModelResponse
                };
                
                return {
                    ...currentProject,
                    tools: {
                        ...currentProject.tools,
                        chat: {
                            ...chatData,
                            sessions: { ...chatData.sessions, [currentActiveSession.id]: sessionWithModelMessage }
                        }
                    }
                };
            });

        } catch (error: any) {
             if (stopGenerationRef.current) return;
            const errorMessage: Message = { id: uuidv4(), role: MessageRole.MODEL, text: error.message || "An unknown error occurred.", isError: true };
            
            onUpdateProject(currentProject => {
                const chatData = currentProject.tools.chat;
                if (!chatData || !chatData.activeSessionId) return currentProject;
                
                const currentActiveSession = chatData.sessions[chatData.activeSessionId];
                const sessionWithError = { 
                    ...currentActiveSession, 
                    messages: [...currentActiveSession.messages, errorMessage] 
                };
                
                return {
                    ...currentProject,
                    tools: {
                        ...currentProject.tools,
                        chat: {
                            ...chatData,
                            sessions: { ...chatData.sessions, [currentActiveSession.id]: sessionWithError }
                        }
                    }
                };
            });
        } finally {
            if (!stopGenerationRef.current) {
                setIsLoading(false);
            }
        }
    };
  
    const toolComponentMap: Record<ToolType, React.ReactNode> = {
        'chat': (() => {
            const chatData = project.tools.chat;
            const activeSession = chatData && chatData.activeSessionId ? chatData.sessions[chatData.activeSessionId] : null;
            const messages = activeSession ? activeSession.messages : [];
            return (
                <div className="flex flex-col h-full bg-background-darkest">
                    <MessageList messages={messages} isLoading={isLoading} bottomRef={bottomRef} t={t} />
                    <ChatInput 
                        onSendMessage={handleSendMessage} 
                        isLoading={isLoading} 
                        placeholder={t('chatInput.placeholder')}
                        onStopGeneration={handleStopGeneration}
                        settings={settings}
                        t={t}
                    />
                </div>
            );
        })(),
        'quiz': <QuizView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'mind_map': <MindMapView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'code_mode': <CodeModeView project={project} onUpdateProject={onUpdateProject} />,
        'flashcards': <FlashcardView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'audio_transcription': <AudioTranscriberView project={project} onUpdateProject={onUpdateProject} />,
        'presentation': <PresentationView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'kanban': <KanbanView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'calendar': <CalendarView project={project} onUpdateProject={onUpdateProject} />,
        'image_editor': <ImageEditorView project={project} onUpdateProject={onUpdateProject} />,
        'smartboard': <SmartboardView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'docs': <DocsView project={project} onUpdateProject={onUpdateProject} settings={settings} />,
        'games': <GamesView settings={settings} />,
        // Fix: Add video generator to the tool map.
        'video_generator': <VideoGeneratorView project={project} onUpdateProject={onUpdateProject} />,
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
}