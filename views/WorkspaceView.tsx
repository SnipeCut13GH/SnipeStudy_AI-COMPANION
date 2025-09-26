import React, { useState, useEffect, useCallback } from 'react';
import { Project, ToolType } from '../types.ts';
import { Sidebar } from '../components/workspace/Sidebar.tsx';
import Header from '../components/workspace/Header.tsx';
import { ToolNavbar } from '../components/workspace/ToolNavbar.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { ProjectDashboard } from '../components/workspace/ProjectDashboard.tsx';
import { AppSettings, WidgetsState, WidgetId } from '../App.tsx';
import { AppGridView } from '../components/AppGridView.tsx';

interface WorkspaceViewProps {
    project: Project;
    onUpdateProject: (updater: (project: Project) => Project) => void;
    onOpenSettings: () => void;
    onOpenPomodoro: () => void;
    onOpenLiveMode: () => void;
    onOpenCalculator: () => void;
    settings: AppSettings;
    openWidgets: WidgetsState;
    onWidgetAction: (id: WidgetId, action: 'open' | 'close' | 'minimize' | 'restore') => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    project,
    onUpdateProject,
    onOpenSettings,
    onOpenPomodoro,
    onOpenLiveMode,
    onOpenCalculator,
    settings,
    openWidgets,
    onWidgetAction,
}) => {
    const [openTools, setOpenTools] = useLocalStorage<ToolType[]>(`educompanion-open-tools-${project.id}`, ['chat']);
    const [activeTool, setActiveTool] = useLocalStorage<ToolType>(`educompanion-active-tool-${project.id}`, 'chat');
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAppGridOpen, setIsAppGridOpen] = useState(false);
    
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Reset tool state when project changes
    useEffect(() => {
        const savedOpenTools = localStorage.getItem(`educompanion-open-tools-${project.id}`);
        setOpenTools(savedOpenTools ? JSON.parse(savedOpenTools) : ['chat']);

        const savedActiveTool = localStorage.getItem(`educompanion-active-tool-${project.id}`);
        setActiveTool(savedActiveTool ? JSON.parse(savedActiveTool) : 'chat');
    }, [project.id, setOpenTools, setActiveTool]);

    const handleSelectTool = useCallback((tool: ToolType) => {
        if (!openTools.includes(tool)) {
            setOpenTools(prev => [...prev, tool]);
        }
        setActiveTool(tool);
        setIsAppGridOpen(false);
    }, [openTools, setOpenTools, setActiveTool]);


    const handleCloseTool = (toolToClose: ToolType) => {
        if (toolToClose === 'chat') return; // Cannot close chat
        
        const newOpenTools = openTools.filter(t => t !== toolToClose);
        setOpenTools(newOpenTools);

        if (activeTool === toolToClose) {
            // Set active tool to the last one in the new list, or chat as a fallback
            setActiveTool(newOpenTools[newOpenTools.length - 1] || 'chat');
        }
    };
    
    return (
        <div className="flex h-full w-full">
            <Sidebar 
                onOpenSettings={onOpenSettings}
                isMobile={isMobile}
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                isCollapsed={!isMobile && isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(p => !p)}
                settings={settings}
                project={project}
                onUpdateProject={onUpdateProject}
            />
            <main className="flex-1 flex flex-col bg-background-dark min-w-0">
                <Header 
                    onOpenPomodoro={onOpenPomodoro}
                    onOpenLiveMode={onOpenLiveMode}
                    onOpenCalculator={onOpenCalculator}
                    isMobile={isMobile}
                    onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                    settings={settings}
                />
                <ToolNavbar 
                    openTools={openTools}
                    activeTool={activeTool} 
                    onSelectTool={setActiveTool}
                    onCloseTool={handleCloseTool}
                    onOpenAppGrid={() => setIsAppGridOpen(true)}
                    minimizedWidgets={openWidgets}
                    onWidgetAction={onWidgetAction}
                />
                <div className="flex-1 overflow-hidden">
                    <ProjectDashboard
                      project={project}
                      onUpdateProject={onUpdateProject}
                      activeTool={activeTool}
                      settings={settings}
                    />
                </div>
            </main>
            {isAppGridOpen && (
                <AppGridView 
                    onSelectTool={handleSelectTool}
                    onClose={() => setIsAppGridOpen(false)}
                />
            )}
        </div>
    );
};