import React from 'react';
import { Project, User } from '../types.ts';
import { Button } from './common/Button.tsx';

const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const PomodoroIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
);
const LiveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" /></svg>
);


interface HeaderProps {
  project: Project;
  onDeleteProject: (id: string) => void;
  onOpenPomodoro: () => void;
  onOpenLiveMode: () => void;
  isMobile: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ project, onDeleteProject, onOpenPomodoro, onOpenLiveMode, isMobile, onToggleSidebar }) => {
  return (
    <header className="p-4 border-b border-border-color flex-shrink-0 flex items-center justify-between bg-surface">
      <div className="flex items-center gap-3">
        {isMobile && <Button onClick={onToggleSidebar} variant="ghost" size="sm" className="p-2"><MenuIcon /></Button>}
        <div>
            <h2 className="text-lg font-bold text-text-primary truncate">{project.name}</h2>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={onOpenPomodoro} size="sm" variant="secondary" leftIcon={<PomodoroIcon />}>Timer</Button>
        <Button onClick={onOpenLiveMode} size="sm" variant="secondary" leftIcon={<LiveIcon />}>Live</Button>
      </div>
    </header>
  );
};

export default Header;