import React, { useState, useEffect, useCallback, useReducer, useMemo, createContext, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { Project } from './types.ts';
import { Welcome } from './components/Welcome.tsx';
import { WorkspaceView } from './views/WorkspaceView.tsx';
import { Settings } from './components/Settings.tsx';
import { PomodoroTimer } from './components/PomodoroTimer.tsx';
import { Calculator } from './components/Calculator.tsx';
import { LiveModeOverlay } from './components/LiveModeOverlay.tsx';
import { Toast } from './components/Toast.tsx';

// TYPE DEFINITIONS
export interface AppSettings {
  theme: 'light' | 'dark';
  username: string;
  systemInstruction: string;
  aiVoiceURI: string | null;
  aiSpeed: number;
  aiPitch: number;
  language: string;
}

export type PomodoroMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_TIMES: Record<PomodoroMode, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export interface PomodoroState {
  mode: PomodoroMode;
  timeLeft: number;
  isActive: boolean;
  cycles: number;
}

export type PomodoroAction =
  | { type: 'TOGGLE' }
  | { type: 'RESET' }
  | { type: 'SWITCH_MODE'; mode: PomodoroMode }
  | { type: 'TICK' };

export type WidgetId = 'pomodoro' | 'calculator' | 'liveMode';
export type WidgetStatus = 'closed' | 'open' | 'minimized';
export type WidgetsState = Record<WidgetId, WidgetStatus>;

// TOAST CONTEXT
interface ToastContextType {
  showToast: (message: string, duration?: number) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

// POMODORO REDUCER
const pomodoroReducer = (state: PomodoroState, action: PomodoroAction): PomodoroState => {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, isActive: !state.isActive };
    case 'TICK':
      if (!state.isActive) {
        return state;
      }
      if (state.timeLeft > 0) {
        return { ...state, timeLeft: state.timeLeft - 1 };
      }
      // Time is up, switch modes
      if (state.mode === 'work') {
        const newCycles = state.cycles + 1;
        const nextMode: PomodoroMode = newCycles % 4 === 0 ? 'longBreak' : 'shortBreak';
        return {
          ...state,
          isActive: false,
          cycles: newCycles,
          mode: nextMode,
          timeLeft: MODE_TIMES[nextMode],
        };
      } else {
        // When a break ends, return to 'work' mode.
        return {
          ...state,
          isActive: false,
          mode: 'work',
          timeLeft: MODE_TIMES.work,
        };
      }
    case 'SWITCH_MODE':
      return { ...state, mode: action.mode, timeLeft: MODE_TIMES[action.mode], isActive: false };
    case 'RESET':
      return { ...state, timeLeft: MODE_TIMES[state.mode], isActive: false };
    default:
      return state;
  }
};

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'dark',
    username: 'Studious Snipe',
    systemInstruction: 'You are StudyBot, a helpful AI assistant focused on learning and productivity. Be concise and clear. When providing links, prefer direct links to the content (e.g., a specific video or article) over general links (e.g., a channel homepage or main website).',
    aiVoiceURI: null,
    aiSpeed: 1,
    aiPitch: 1,
    language: 'en',
};

const createNewProject = (name: string): Project => {
    const defaultSessionId = uuidv4();
    return {
        id: uuidv4(),
        name,
        tools: {
            chat: {
                sessions: {
                    [defaultSessionId]: {
                        id: defaultSessionId,
                        title: 'General Chat',
                        messages: [],
                        createdAt: new Date().toISOString(),
                    }
                },
                activeSessionId: defaultSessionId
            }
        },
        lastAccessed: new Date().toISOString(),
    };
};

// Fix: Define and type the initial state for the pomodoro reducer outside the component to prevent type inference issues.
const initialPomodoroState: PomodoroState = {
    mode: 'work',
    timeLeft: MODE_TIMES.work,
    isActive: false,
    cycles: 0,
};

const App: React.FC = () => {
    const [projects, setProjects] = useLocalStorage<Project[]>('educompanion-projects', []);
    const [activeProjectId, setActiveProjectId] = useLocalStorage<string | null>('educompanion-active-project', null);
    const [settings, setSettings] = useLocalStorage<AppSettings>('educompanion-settings', DEFAULT_SETTINGS);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [widgets, setWidgets] = useState<WidgetsState>({ pomodoro: 'closed', calculator: 'closed', liveMode: 'closed' });
    const [toast, setToast] = useState<{ message: string; id: number; duration: number } | null>(null);

    const [pomodoroState, pomodoroDispatch] = useReducer(pomodoroReducer, initialPomodoroState);
    
    // THEME
    useEffect(() => {
        document.documentElement.className = settings.theme;
    }, [settings.theme]);
    
    // POMODORO TIMER
    useEffect(() => {
        let timer: number | null = null;
        if (pomodoroState.isActive) {
            timer = window.setInterval(() => pomodoroDispatch({ type: 'TICK' }), 1000);
        }
        return () => { if (timer) clearInterval(timer); };
    }, [pomodoroState.isActive]);
    
    const activeProject = useMemo(() => {
        return projects.find(p => p.id === activeProjectId) || null;
    }, [projects, activeProjectId]);

    const handleCreateProject = (name: string) => {
        const newProject = createNewProject(name);
        setProjects([...projects, newProject]);
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

    const handleUpdateProject = (updater: (project: Project) => Project) => {
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === activeProjectId) {
                    const updatedProject = updater(p);
                    updatedProject.lastAccessed = new Date().toISOString();
                    return updatedProject;
                }
                return p;
            })
        );
    };

    const handleDeleteProject = (id: string) => {
        const remainingProjects = projects.filter(p => p.id !== id);
        setProjects(remainingProjects);
        if (activeProjectId === id) {
            setActiveProjectId(remainingProjects.length > 0 ? remainingProjects.sort((a,b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime())[0].id : null);
        }
    };
    
    const handleWidgetAction = (id: WidgetId, action: 'open' | 'close' | 'minimize' | 'restore') => {
        let status: WidgetStatus = 'closed';
        if (action === 'open' || action === 'restore') status = 'open';
        else if (action === 'minimize') status = 'minimized';
        setWidgets(prev => ({ ...prev, [id]: status }));
    };

    const showToast = (message: string, duration = 3000) => {
        setToast({ message, id: Date.now(), duration });
    };

    const onExportData = () => {
        const data = JSON.stringify({ projects, settings }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'educompanion_backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully.');
    };

    const onResetApplication = () => {
        if (window.confirm('Are you sure you want to reset the application? This will delete all your projects and settings.')) {
            localStorage.clear();
            window.location.reload();
        }
    };
    
    const toastApi = useMemo(() => ({ showToast }), []);
    
    if (!activeProject) {
        return <Welcome onCreateProject={handleCreateProject} />;
    }

    return (
        <ToastContext.Provider value={toastApi}>
            <div className="bg-background text-text-primary h-screen w-screen font-sans overflow-hidden">
                <WorkspaceView
                    projects={projects}
                    activeProject={activeProject}
                    onSetActiveProject={handleSetActiveProject}
                    onCreateProject={handleCreateProject}
                    onUpdateProject={handleUpdateProject}
                    onDeleteProject={handleDeleteProject}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenPomodoro={() => handleWidgetAction('pomodoro', 'open')}
                    onOpenLiveMode={() => handleWidgetAction('liveMode', 'open')}
                    onOpenCalculator={() => handleWidgetAction('calculator', 'open')}
                    settings={settings}
                    openWidgets={widgets}
                    onWidgetAction={handleWidgetAction}
                />
                
                {isSettingsOpen && <Settings
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    settings={settings}
                    onThemeChange={theme => setSettings(s => ({ ...s, theme }))}
                    onUsernameChange={name => setSettings(s => ({ ...s, username: name }))}
                    onSystemInstructionChange={instruction => setSettings(s => ({...s, systemInstruction: instruction}))}
                    onAiVoiceChange={voiceURI => setSettings(s => ({...s, aiVoiceURI: voiceURI}))}
                    onAiSpeedChange={speed => setSettings(s => ({ ...s, aiSpeed: speed }))}
                    onAiPitchChange={pitch => setSettings(s => ({ ...s, aiPitch: pitch }))}
                    onLanguageChange={language => setSettings(s => ({ ...s, language }))}
                    onExportData={onExportData}
                    onResetApplication={onResetApplication}
                />}
                
                {widgets.pomodoro === 'open' && <PomodoroTimer
                    pomodoroState={pomodoroState}
                    onAction={pomodoroDispatch}
                    onClose={() => handleWidgetAction('pomodoro', 'close')}
                    onMinimize={() => handleWidgetAction('pomodoro', 'minimize')}
                />}

                {widgets.calculator === 'open' && <Calculator
                    onClose={() => handleWidgetAction('calculator', 'close')}
                    onMinimize={() => handleWidgetAction('calculator', 'minimize')}
                />}

                {widgets.liveMode === 'open' && <LiveModeOverlay
                    onClose={() => handleWidgetAction('liveMode', 'close')}
                    settings={settings}
                />}

                {toast && <Toast key={toast.id} message={toast.message} duration={toast.duration} onClose={() => setToast(null)} />}
            </div>
        </ToastContext.Provider>
    );
};

export default App;