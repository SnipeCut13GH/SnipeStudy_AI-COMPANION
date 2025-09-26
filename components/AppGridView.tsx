import React from 'react';
import { createPortal } from 'react-dom';
import { ToolType } from '../types';
import { getToolIcon, toolConfigs, allTools } from './common/ToolIcons';

interface AppGridViewProps {
    onSelectTool: (tool: ToolType) => void;
    onClose: () => void;
}

export const AppGridView: React.FC<AppGridViewProps> = ({ onSelectTool, onClose }) => {

    const handleSelect = (tool: ToolType) => {
        onSelectTool(tool);
        onClose();
    }

    return createPortal(
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in" 
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-background-light shadow-2xl w-full max-w-2xl border-border-color flex flex-col h-full sm:h-auto sm:max-h-[80vh] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
              <h2 className="text-lg font-bold text-text-primary">All Apps</h2>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allTools.map(toolId => (
                        <div key={toolId} onClick={() => handleSelect(toolId)} className="p-4 bg-overlay rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-border-color transition-colors">
                            <div className="w-12 h-12 mb-3 text-brand-primary">
                                {getToolIcon(toolId, 'w-full h-full')}
                            </div>
                            <span className="text-sm font-semibold">{toolConfigs[toolId]?.name}</span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
           <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
              .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
        </div>,
        document.getElementById('modal-root')!
    )
};