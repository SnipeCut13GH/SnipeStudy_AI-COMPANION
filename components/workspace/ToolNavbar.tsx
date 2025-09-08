import React from 'react';
import { ToolType } from '../../types';
import { Button } from '../common/Button.tsx';
import { getToolIcon, toolConfigs } from '../common/ToolIcons.tsx';

interface ToolNavbarProps {
  openTools: ToolType[];
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onCloseTool: (tool: ToolType) => void;
  onOpenAppGrid: () => void;
}

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
);
const AppsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);


export const ToolNavbar: React.FC<ToolNavbarProps> = ({ activeTool, onSelectTool, openTools, onCloseTool, onOpenAppGrid }) => {
  return (
    <nav className="flex-shrink-0 bg-surface border-b border-border-color flex items-center gap-2 p-2">
      <Button onClick={onOpenAppGrid} variant="secondary" size="sm" leftIcon={<AppsIcon/>}>Apps</Button>
      <div className="flex items-center gap-1 overflow-x-auto">
        {openTools.map(toolId => (
          <button
            key={toolId}
            onClick={() => onSelectTool(toolId)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2 ${
              activeTool === toolId
                ? 'bg-brand-primary/20 text-brand-primary'
                : 'text-text-secondary hover:bg-overlay hover:text-text-primary'
            }`}
          >
            <span className="w-4 h-4">{getToolIcon(toolId)}</span>
            {toolConfigs[toolId]?.name || toolId}
             {toolId !== 'chat' && (
                <span 
                    onClick={(e) => { e.stopPropagation(); onCloseTool(toolId); }} 
                    className="w-4 h-4 rounded-full hover:bg-black/20 flex items-center justify-center text-xs"
                >
                    &times;
                </span>
             )}
          </button>
        ))}
        <button onClick={onOpenAppGrid} className="ml-1 p-2 rounded-md text-text-secondary hover:bg-overlay hover:text-text-primary"><PlusIcon /></button>
      </div>
    </nav>
  );
};
