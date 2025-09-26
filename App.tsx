import React, { useState, useEffect, useReducer, useMemo, createContext, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { Project } from './types.ts';
import { WorkspaceView } from './views/WorkspaceView.tsx';
import { Settings } from './components/Settings.tsx';
import { PomodoroTimer } from './components/PomodoroTimer.tsx';
import { Calculator } from './components/Calculator.tsx';
import { LiveModeOverlay } from './components/LiveModeOverlay.tsx';
import { Toast } from './components/Toast.tsx';
import { Spinner } from './components/common/Spinner.tsx';

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
    systemInstruction: 'You are StudyBot, a helpful AI assistant focused on learning and productivity. Be concise and clear. Do not use LaTeX formatting or dollar signs ($) for mathematical expressions; use plain text instead (e.g., X + 2 = 10). Do not suggest external resources or provide links.',
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
    const [project, setProject] = useLocalStorage<Project | null>('educompanion-project', null);
    const [settings, setSettings] = useLocalStorage<AppSettings>('educompanion-settings', DEFAULT_SETTINGS);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [widgets, setWidgets] = useState<WidgetsState>({ pomodoro: 'closed', calculator: 'closed', liveMode: 'closed' });
    const [toast, setToast] = useState<{ message: string; id: number; duration: number } | null>(null);

    const [pomodoroState, pomodoroDispatch] = useReducer(pomodoroReducer, initialPomodoroState);
    
    // Initialize a default project on first load if none exists
    useEffect(() => {
        if (!project) {
            const defaultProject = createNewProject('EduCompanion Workspace');
            setProject(defaultProject);
        }
    }, [project, setProject]);

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
    
    const handleUpdateProject = (updater: (project: Project) => Project) => {
        setProject(prevProject => {
            if (!prevProject) return null;
            const updatedProject = updater(prevProject);
            updatedProject.lastAccessed = new Date().toISOString();
            return updatedProject;
        });
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
        const data = JSON.stringify({ project, settings }, null, 2);
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
        if (window.confirm('Are you sure you want to reset the application? This will delete your workspace and settings.')) {
            localStorage.clear();
            window.location.reload();
        }
    };
    
    const toastApi = useMemo(() => ({ showToast }), []);
    
    if (!project) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <ToastContext.Provider value={toastApi}>
            <div className="bg-background text-text-primary h-screen w-screen font-sans overflow-hidden">
                <WorkspaceView
                    project={project}
                    onUpdateProject={handleUpdateProject}
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