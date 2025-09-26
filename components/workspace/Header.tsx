import React from 'react';
import { Project } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { AppSettings } from '../../App.tsx';
import { getTranslator } from '../../services/translator.ts';

const MenuIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const PomodoroIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
);
const LiveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" /></svg>
);
const CalculatorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 4a1 1 0 100 2h6a1 1 0 100-2H7zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
);


interface HeaderProps {
  onOpenPomodoro: () => void;
  onOpenLiveMode: () => void;
  onOpenCalculator: () => void;
  isMobile: boolean;
  onToggleSidebar: () => void;
  settings: AppSettings;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPomodoro, onOpenLiveMode, onOpenCalculator, isMobile, onToggleSidebar, settings }) => {
  const { t } = getTranslator(settings.language);
  
  return (
    <header className="px-2 sm:px-4 py-2 border-b border-border-color flex-shrink-0 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-shrink min-w-0">
        {isMobile && <Button onClick={onToggleSidebar} variant="ghost" size="sm" className="p-2 flex-shrink-0"><MenuIcon /></Button>}
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <Button onClick={onOpenPomodoro} size="sm" variant="secondary" leftIcon={<PomodoroIcon />}>{t('header.timer')}</Button>
        <Button onClick={onOpenCalculator} size="sm" variant="secondary" leftIcon={<CalculatorIcon />}>{t('header.calc')}</Button>
        <Button onClick={onOpenLiveMode} size="sm" variant="secondary" leftIcon={<LiveIcon />}>{t('header.live')}</Button>
      </div>
    </header>
  );
};

export default Header;