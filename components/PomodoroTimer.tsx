import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PomodoroTimerProps {
  onClose: () => void;
}

type Mode = 'work' | 'shortBreak' | 'longBreak';

const MODE_TIMES = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
};

const MODE_COLORS = {
    work: 'bg-red-500',
    shortBreak: 'bg-green-500',
    longBreak: 'bg-blue-500',
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onClose }) => {
  const [mode, setMode] = useState<Mode>('work');
  const [time, setTime] = useState(MODE_TIMES[mode]);
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime(t => t - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time]);
  
  const handleModeChange = (newMode: Mode) => {
    setIsActive(false);
    setMode(newMode);
    setTime(MODE_TIMES[newMode]);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY, initialX: position.x, initialY: position.y };
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;
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

  return createPortal(
    <div 
        ref={nodeRef}
        style={{ top: `${position.y}px`, left: `${position.x}px`}}
        className="fixed w-72 bg-background-light rounded-lg shadow-2xl border border-border-color z-40 text-white"
    >
        <div onMouseDown={handleDragStart} onTouchStart={handleDragStart} className="p-2 bg-background-dark rounded-t-lg cursor-move flex justify-between items-center touch-none">
            <h3 className="text-sm font-bold">Pomodoro Timer</h3>
            <button onClick={onClose} className="text-text-secondary hover:text-white">&times;</button>
        </div>
        <div className="p-6 flex flex-col items-center">
            <div className="flex space-x-2 mb-4">
                <button onClick={() => handleModeChange('work')} className={`px-3 py-1 text-xs rounded ${mode === 'work' ? 'bg-red-600' : 'bg-background-dark'}`}>Work</button>
                <button onClick={() => handleModeChange('shortBreak')} className={`px-3 py-1 text-xs rounded ${mode === 'shortBreak' ? 'bg-green-600' : 'bg-background-dark'}`}>Short Break</button>
                <button onClick={() => handleModeChange('longBreak')} className={`px-3 py-1 text-xs rounded ${mode === 'longBreak' ? 'bg-blue-600' : 'bg-background-dark'}`}>Long Break</button>
            </div>
            <div className="text-6xl font-mono font-bold my-4">{formatTime(time)}</div>
            <div className="flex space-x-4">
                <button onClick={() => setIsActive(!isActive)} className={`w-24 px-4 py-2 rounded-md font-bold ${isActive ? 'bg-yellow-600' : 'bg-brand-primary'}`}>
                    {isActive ? 'Pause' : 'Start'}
                </button>
                <button onClick={() => handleModeChange(mode)} className="px-4 py-2 rounded-md bg-background-dark">Reset</button>
            </div>
        </div>
    </div>,
    document.body
  );
};