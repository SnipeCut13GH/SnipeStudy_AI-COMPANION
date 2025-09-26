import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Command } from '../../types.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, setIsOpen, commands }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setSearch('');
        setSelectedIndex(0);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const filteredCommands = search 
    ? commands.filter(cmd => 
        cmd.name.toLowerCase().includes(search.toLowerCase()) || 
        cmd.category.toLowerCase().includes(search.toLowerCase()))
    : commands;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].action();
                setIsOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, setIsOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center pt-20" onClick={() => setIsOpen(false)}>
      <div className="bg-background-light rounded-xl shadow-2xl w-full max-w-xl border border-border-color flex flex-col max-h-[50vh] animate-command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-border-color">
            <input 
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
                placeholder="Type a command or search..."
                className="w-full bg-transparent text-text-primary placeholder-text-secondary focus:outline-none"
            />
        </div>
        <div className="overflow-y-auto p-2">
            {filteredCommands.length > 0 ? filteredCommands.map((cmd, index) => (
                <div 
                    key={cmd.id}
                    onClick={() => { cmd.action(); setIsOpen(false); }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 flex justify-between items-center rounded-md cursor-pointer ${selectedIndex === index ? 'bg-brand-primary/20' : 'hover:bg-overlay'}`}
                >
                    <span className="text-text-primary text-sm">{cmd.name}</span>
                    <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-md">{cmd.category}</span>
                </div>
            )) : <p className="text-center text-text-secondary p-4">No results found.</p>}
        </div>
      </div>
      <style>{`
          @keyframes animate-command-palette {
            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-command-palette { animation: animate-command-palette 0.2s ease-out forwards; }
        `}</style>
    </div>,
    document.getElementById('modal-root')!
  );
};