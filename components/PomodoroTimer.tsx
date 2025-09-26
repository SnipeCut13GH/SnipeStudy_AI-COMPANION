import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PomodoroState, PomodoroAction } from '../App.tsx';

interface PomodoroTimerProps {
  pomodoroState: PomodoroState;
  onAction: (action: PomodoroAction) => void;
  onClose: () => void;
  onMinimize: () => void;
}

const MODE_TIMES = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};

const MinimizeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
);

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ pomodoroState, onAction, onClose, onMinimize }) => {
    const { mode, timeLeft, isActive } = pomodoroState;
    const [position, setPosition] = useState({ x: window.innerWidth - 220, y: 120 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
    
    const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => ({
        x: 'touches' in e ? e.touches[0].clientX : e.clientX,
        y: 'touches' in e ? e.touches[0].clientY : e.clientY,
    });

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        isDragging.current = true;
        const { x, y } = getClientCoords(e);
        dragStart.current = { x, y, initialX: position.x, initialY: position.y };
    };

    useEffect(() => {
        const handleDragMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            const { x, y } = getClientCoords(e);
            const dx = x - dragStart.current.x;
            const dy = y - dragStart.current.y;
            setPosition({
                x: dragStart.current.initialX + dx,
                y: dragStart.current.initialY + dy,
            });
        };
        const handleDragEnd = () => {
            isDragging.current = false;
        };
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove);
        document.addEventListener('touchend', handleDragEnd);
        return () => {
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, []);
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const progress = (MODE_TIMES[mode] - timeLeft) / MODE_TIMES[mode];

    return createPortal(
        <div 
            style={{ top: `${position.y}px`, left: `${position.x}px` }}
            className="fixed bg-background-light rounded-lg shadow-2xl border border-border-color z-40 text-text-primary w-48"
        >
            <div 
                className="p-2 bg-background-dark rounded-t-lg flex justify-between items-center cursor-move touch-none"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
            >
                <h3 className="text-sm font-bold">Pomodoro</h3>
                <div className="flex items-center">
                    <button onClick={onMinimize} className="p-1 text-text-secondary hover:text-white" aria-label="Minimize"><MinimizeIcon /></button>
                    <button onClick={onClose} className="p-1 text-text-secondary hover:text-white text-lg" aria-label="Close">&times;</button>
                </div>
            </div>
            <div className="p-3 flex flex-col items-center">
                 <div className="relative w-28 h-28 mb-3">
                     <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-overlay" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                        <circle
                            className="text-brand-primary"
                            strokeWidth="7"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={(2 * Math.PI * 45) * (1 - progress)}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="45"
                            cx="50"
                            cy="50"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-mono text-text-primary">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                <div className="flex gap-2 mb-3">
                    <button onClick={() => onAction({ type: 'SWITCH_MODE', mode: 'work' })} className={`px-2 py-1 text-xs rounded ${mode === 'work' ? 'bg-brand-primary/50 text-brand-primary' : 'bg-overlay'}`}>Work</button>
                    <button onClick={() => onAction({ type: 'SWITCH_MODE', mode: 'shortBreak' })} className={`px-2 py-1 text-xs rounded ${mode === 'shortBreak' ? 'bg-brand-primary/50 text-brand-primary' : 'bg-overlay'}`}>Break</button>
                    <button onClick={() => onAction({ type: 'SWITCH_MODE', mode: 'longBreak' })} className={`px-2 py-1 text-xs rounded ${mode === 'longBreak' ? 'bg-brand-primary/50 text-brand-primary' : 'bg-overlay'}`}>Long</button>
                </div>

                <button 
                    onClick={() => onAction({ type: 'TOGGLE' })}
                    className="w-full bg-brand-primary text-background font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 text-base"
                >
                    {isActive ? 'PAUSE' : 'START'}
                </button>
            </div>
        </div>,
        document.body
    );
};