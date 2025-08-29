import React from 'react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  disabled: boolean;
}

interface ModeButtonProps {
    Icon: React.FC<{className: string}>;
    label: string;
    isActive: boolean;
    onClick: () => void;
    disabled: boolean;
}

const ChatIcon = ({ className }: {className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
    </svg>
);

const GuideIcon = ({ className }: {className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 0114.5 16c1.255 0 2.443-.29 3.5-.804v-10A7.968 7.968 0 0014.5 4z" />
    </svg>
);

const QuizIcon = ({ className }: {className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
);

const LiveIcon = ({ className }: {className: string}) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.5 16.5a1 1 0 01-1.707-.707l1.165-4.832a1 1 0 01.944-.661h4.212a1 1 0 01.944.661l1.165 4.832A1 1 0 0114.5 16.5h-9z" />
        <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v2.586A3 3 0 007 11.414V12a1 1 0 102 0v-.586A3 3 0 0011 8.586V6a4 4 0 00-1-3.465z" clipRule="evenodd" />
    </svg>
);


const ModeButton: React.FC<ModeButtonProps> = ({ Icon, label, isActive, onClick, disabled }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-brand-secondary text-white' : 'hover:bg-gray-700 text-gray-400'
        } disabled:opacity-50 disabled:hover:bg-transparent`}
    >
        <Icon className="h-6 w-6 mb-1" />
        <span className="text-xs font-medium">{label}</span>
    </button>
);

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange, disabled }) => {
    const modes = [
        { id: AppMode.CHAT, label: 'Chat', Icon: ChatIcon },
        { id: AppMode.STUDY_GUIDE, label: 'Guide', Icon: GuideIcon },
        { id: AppMode.QUIZ, label: 'Quiz', Icon: QuizIcon },
        { id: AppMode.LIVE, label: 'Live', Icon: LiveIcon },
    ];
    
  return (
    <div className="bg-background-dark p-1.5 rounded-xl flex items-center justify-around space-x-1 mb-3">
        {modes.map(mode => (
             <ModeButton 
                key={mode.id}
                Icon={mode.Icon}
                label={mode.label}
                isActive={currentMode === mode.id}
                onClick={() => onModeChange(mode.id)}
                disabled={disabled}
            />
        ))}
    </div>
  );
};