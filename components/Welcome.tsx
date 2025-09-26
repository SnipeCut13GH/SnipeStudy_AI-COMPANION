import React, { useState } from 'react';
import { Button } from './common/Button.tsx';

interface WelcomeProps {
  onCreateProject: (name: string) => void;
}

const EduCompanionIcon: React.FC = () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6">
        <defs>
            <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-primary)" />
                <stop offset="100%" stopColor="var(--brand-secondary)" />
            </linearGradient>
        </defs>
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 7L12 12L22 7" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12V22" stroke="url(#icon-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 4.5L7 9.5" stroke="url(#icon-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


export const Welcome: React.FC<WelcomeProps> = ({ onCreateProject }) => {
    const [projectName, setProjectName] = useState('My First Project');

    const handleCreate = () => {
        if (projectName.trim()) {
            onCreateProject(projectName.trim());
        }
    };

    return (
        <div className="h-full flex items-center justify-center p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-lg text-center p-8 md:p-12 bg-surface/80 backdrop-blur-sm sm:rounded-2xl sm:shadow-2xl sm:border sm:border-border-color/50 flex flex-col justify-center">
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <EduCompanionIcon />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-text-primary animate-fade-in-up" style={{ animationDelay: '200ms' }}>Welcome to EduCompanion</h1>
                <p className="text-text-secondary text-lg mb-10 animate-fade-in-up" style={{ animationDelay: '300ms' }}>Your AI-powered learning and productivity workspace.</p>
                <p className="text-text-primary mb-4 font-medium animate-fade-in-up" style={{ animationDelay: '400ms' }}>Create a project to get started.</p>
                
                <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                        placeholder="Your first project name..."
                        className="flex-1 bg-background-light border-2 border-border-color p-3 rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
                    />
                    <Button onClick={handleCreate} disabled={!projectName.trim()} size="lg" className="sm:w-auto">
                        Create Project
                    </Button>
                </div>
            </div>
        </div>
    );
};