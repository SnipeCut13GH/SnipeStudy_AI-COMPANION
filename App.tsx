import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { Project, ProjectTools, ToolType } from './types.ts';
import { Welcome } from './components/Welcome.tsx';
import { WorkspaceView } from './views/WorkspaceView.tsx';
import { Settings } from './components/Settings.tsx';
import { PomodoroTimer } from './components/PomodoroTimer.tsx';
import { LiveModeOverlay } from './components/LiveModeOverlay.tsx';
import { Calculator } from './components/Calculator.tsx';

const defaultSettings = {
    theme: 'dark' as 'dark' | 'light',
    username: 'User',
    fontSize: 14,
    systemInstruction: "You are SnipeStudy, an expert AI tutor. Your primary goal is to help users learn by guiding them to the answers, not by providing solutions directly. When faced with academic questions, especially in subjects like math, science, or history, adopt a Socratic method. Break down problems into smaller steps, ask leading questions to stimulate their thinking, and explain underlying concepts. Never give the final answer outright for educational problems. Instead, empower the user to discover the solution on their own. For general knowledge or non-academic questions, you can be more direct.",
    aiVoiceURI: null as string | null,
    aiSpeed: 1,
    aiPitch: 1,
};

export type AppSettings = typeof defaultSettings;

// Fix: Add 'whiteboard' and 'docs' to ensure they are initialized for new projects.
const DEFAULT_TOOLS: ToolType[] = [
    'chat', 'smartboard', 'kanban', 'quiz', 'flashcards', 'story',
    'presentation', 'mind_map', 'calendar', 'code_mode',
    'image_editor', 'video_generator', 'audio_transcription', 'whiteboard', 'docs'
];

const createInitialToolData = (tool: ToolType): ProjectTools[keyof ProjectTools] => {
    switch (tool) {
        case 'chat': return { messages: [] };
        case 'quiz': return { topic: '', questions: [], currentQuestionIndex: 0, userAnswers: [], score: null, state: 'config' };
        case 'story': return { prompt: '', story: null, slideshow: undefined };
        case 'mind_map': return { nodes: [] };
        case 'code_mode': return { prompt: '', generatedHtml: null };
        case 'flashcards': return { decks: {} };
        case 'audio_transcription': return { audioFile: undefined, transcript: undefined };
        case 'presentation': return { slides: [] };
        case 'kanban': return { tasks: {}, columns: {
            'col-1': { id: 'col-1', title: 'To Do', taskIds: [] },
            'col-2': { id: 'col-2', title: 'In Progress', taskIds: [] },
            'col-3': { id: 'col-3', title: 'Done', taskIds: [] },
        }, columnOrder: ['col-1', 'col-2', 'col-3']};
        case 'calendar': return { events: [] };
        case 'image_editor': return { originalImage: null, editedImage: null, prompt: '', status: 'idle' };
        case 'smartboard': return { objects: [], viewport: { x: 0, y: 0, zoom: 1 } };
        case 'video_generator': return { prompt: '', videoUrl: null, operation: null, status: 'idle' };
        case 'whiteboard': return { drawings: [] };
        case 'docs': return { inputText: '', analysisResult: null, analysisType: null };
        default: return {};
    }
};


function App() {
    const [projects, setProjects] = useLocalStorage<Project[]>('snipe-study-projects', []);
    const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('snipe-study-active-project', null);
    const [settings, setSettings] = useLocalStorage('snipe-study-settings', defaultSettings);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
    const [isLiveModeOpen, setIsLiveModeOpen] = useState(false);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        document.documentElement.className = settings.theme;
        document.documentElement.style.fontSize = `${settings.fontSize}px`;
    }, [settings.theme, settings.fontSize]);
    
    useEffect(() => {
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
              console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
              console.log('ServiceWorker registration failed: ', err);
            });
          });
        }
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleCreateProject = (name: string) => {
        const newProject: Project = {
            id: uuidv4(),
            name,
            tools: DEFAULT_TOOLS.reduce((acc, tool) => {
                acc[tool] = createInitialToolData(tool);
                return acc;
            }, {} as ProjectTools),
            lastAccessed: new Date().toISOString(),
        };
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        setActiveProjectId(newProject.id);
    };

    const handleSetActiveProject = (id: string) => {
        const project = projects.find(p => p.id === id);
        if (project) {
            project.lastAccessed = new Date().toISOString();
            setProjects([...projects]);
        }
        setActiveProjectId(id);
    };

    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    };
    
    const handleDeleteProject = (id: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            const updatedProjects = projects.filter(p => p.id !== id);
            setProjects(updatedProjects);
            if (activeProjectId === id) {
                const sortedProjects = [...updatedProjects].sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());
                setActiveProjectId(sortedProjects.length > 0 ? sortedProjects[0].id : null);
            }
        }
    };

    const handleExportData = () => {
        const data = JSON.stringify({ projects, settings }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'snipestudy_backup.json';
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const handleResetApplication = () => {
        if (window.confirm('Are you sure? This will delete all your projects and settings.')) {
            setProjects([]);
            setSettings(defaultSettings);
            setActiveProjectId(null);
        }
    };

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            } else {
                console.log('User dismissed the A2HS prompt');
            }
            setInstallPrompt(null);
        });
    };

    const foundProject = projects.find(p => p.id === activeProjectId);

    // Hydrate project with default tool data to prevent crashes on adding new tools
    const activeProject = foundProject ? {
        ...foundProject,
        tools: {
            ...DEFAULT_TOOLS.reduce((acc, tool) => {
                acc[tool] = createInitialToolData(tool);
                return acc;
            }, {} as ProjectTools),
            ...(foundProject.tools || {}),
        }
    } : undefined;

    const mainContent = () => {
        if (activeProject) {
            return (
                <WorkspaceView
                    projects={projects}
                    activeProject={activeProject}
                    onSetActiveProject={handleSetActiveProject}
                    onCreateProject={handleCreateProject}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenPomodoro={() => setIsPomodoroOpen(true)}
                    onOpenLiveMode={() => setIsLiveModeOpen(true)}
                    onOpenCalculator={() => setIsCalculatorOpen(true)}
                    settings={settings}
                />
            );
        }
        return <Welcome onCreateProject={handleCreateProject} />;
    };
    
    return (
        <div className="h-full w-full bg-surface font-sans text-text-primary">
            {mainContent()}

            {isSettingsOpen && (
                <Settings 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onThemeChange={theme => setSettings(s => ({...s, theme}))}
                    onUsernameChange={name => setSettings(s => ({...s, username: name}))}
                    onFontSizeChange={size => setSettings(s => ({...s, fontSize: size}))}
                    onSystemInstructionChange={instruction => setSettings(s => ({...s, systemInstruction: instruction}))}
                    onAiVoiceChange={uri => setSettings(s => ({ ...s, aiVoiceURI: uri }))}
                    onAiSpeedChange={speed => setSettings(s => ({ ...s, aiSpeed: speed }))}
                    onAiPitchChange={pitch => setSettings(s => ({ ...s, aiPitch: pitch }))}
                    onExportData={handleExportData}
                    onResetApplication={handleResetApplication}
                />
            )}

            {isPomodoroOpen && <PomodoroTimer onClose={() => setIsPomodoroOpen(false)} />}
            {isCalculatorOpen && <Calculator onClose={() => setIsCalculatorOpen(false)} />}
            {isLiveModeOpen && <LiveModeOverlay onClose={() => setIsLiveModeOpen(false)} settings={settings} />}

            {installPrompt && (
                <button
                    onClick={handleInstallClick}
                    className="fixed bottom-6 right-6 bg-brand-primary text-white font-bold py-3 px-5 rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-300 z-50 flex items-center gap-2 animate-bounce"
                    title="Install SnipeStudy to your device"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Install App
                </button>
            )}
        </div>
    );
}

export default App;