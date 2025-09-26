import React from 'react';
import { ToolType } from '../../types';
import { Button } from '../common/Button.tsx';
import { getToolIcon, toolConfigs } from '../common/ToolIcons.tsx';
import { WidgetsState, WidgetId } from '../../App.tsx';

interface ToolNavbarProps {
  openTools: ToolType[];
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onCloseTool: (tool: ToolType) => void;
  onOpenAppGrid: () => void;
  minimizedWidgets: WidgetsState;
  onWidgetAction: (id: WidgetId, action: 'restore' | 'close') => void;
}

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
);
const AppsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);
const PomodoroIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
);
const CalculatorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 4a1 1 0 100 2h6a1 1 0 100-2H7zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
);

const LiveIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" /><path fillRule="evenodd" d="M3 8a1 1 0 011-1h.5a.5.5 0 000-1H4a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H4a1 1 0 01-1-1V8zm12 0a1 1 0 011-1h.5a.5.5 0 000-1H16a1 1 0 00-1 1v4a1 1 0 001 1h.5a.5.5 0 000-1H16a1 1 0 01-1-1V8z" clipRule="evenodd" /></svg>
);

const widgetConfig: Record<WidgetId, { name: string; icon: React.ReactNode }> = {
    pomodoro: { name: 'Timer', icon: <PomodoroIcon /> },
    calculator: { name: 'Calculator', icon: <CalculatorIcon /> },
    liveMode: { name: 'Live', icon: <LiveIcon /> },
};


export const ToolNavbar: React.FC<ToolNavbarProps> = ({ 
    activeTool, onSelectTool, openTools, onCloseTool, onOpenAppGrid, 
    minimizedWidgets, onWidgetAction 
}) => {
  const minimized = (Object.keys(minimizedWidgets) as WidgetId[]).filter(id => minimizedWidgets[id] === 'minimized' && widgetConfig[id]);

  return (
    <nav className="flex-shrink-0 bg-surface border-b border-border-color flex items-center gap-2 p-2">
      <Button onClick={onOpenAppGrid} variant="secondary" size="sm" leftIcon={<AppsIcon/>}>Apps</Button>
      
      {minimized.length > 0 && <div className="h-6 w-px bg-border-color" />}

      {minimized.map(widgetId => (
          <div key={widgetId} className="relative group flex-shrink-0">
             <button
                onClick={() => onWidgetAction(widgetId, 'restore')}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 bg-overlay text-text-primary"
            >
                {widgetConfig[widgetId].icon}
                {widgetConfig[widgetId].name}
                 <span 
                    onClick={(e) => { e.stopPropagation(); onWidgetAction(widgetId, 'close'); }} 
                    className="w-4 h-4 rounded-full hover:bg-black/20 flex items-center justify-center text-xs"
                >
                    &times;
                </span>
            </button>
          </div>
      ))}
      
      {minimized.length > 0 && <div className="h-6 w-px bg-border-color" />}

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