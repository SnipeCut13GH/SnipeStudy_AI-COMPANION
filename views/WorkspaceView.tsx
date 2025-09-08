import React, { useState, useEffect } from 'react';
import { Project, ToolType, Message } from '../types';
import Sidebar from '../components/workspace/Sidebar';
import Header from '../components/workspace/Header';
import { ToolNavbar } from '../components/workspace/ToolNavbar';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useMediaQuery } from '../hooks/useMediaQuery.ts';
import { ProjectDashboard } from '../components/workspace/ProjectDashboard';
import { AppSettings } from '../App.tsx';
import { AppGridView } from '../components/AppGridView.tsx';

interface WorkspaceViewProps {
    projects: Project[];
    activeProject: Project;
    onSetActiveProject: (id: string) => void;
    onCreateProject: (name: string) => void;
    onUpdateProject: (updatedProject: Project) => void;
    onDeleteProject: (id: string) => void;
    onOpenSettings: () => void;
    onOpenPomodoro: () => void;
    onOpenLiveMode: () => void;
    onOpenCalculator: () => void;
    settings: AppSettings;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    projects,
    activeProject,
    onSetActiveProject,
    onCreateProject,
    onUpdateProject,
    onDeleteProject,
    onOpenSettings,
    onOpenPomodoro,
    onOpenLiveMode,
    onOpenCalculator,
    settings
}) => {
    const [openTools, setOpenTools] = useLocalStorage<ToolType[]>(`snipe-study-open-tools-${activeProject.id}`, ['chat']);
    const [activeTool, setActiveTool] = useLocalStorage<ToolType>(`snipe-study-active-tool-${activeProject.id}`, 'chat');
    const [messages, setMessages] = useLocalStorage<Message[]>(`snipe-study-chat-${activeProject.id}`, []);
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAppGridOpen, setIsAppGridOpen] = useState(false);
    
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Reset tool and messages when project changes
    useEffect(() => {
        const savedOpenTools = localStorage.getItem(`snipe-study-open-tools-${activeProject.id}`);
        setOpenTools(savedOpenTools ? JSON.parse(savedOpenTools) : ['chat']);

        const savedActiveTool = localStorage.getItem(`snipe-study-active-tool-${activeProject.id}`);
        setActiveTool(savedActiveTool ? JSON.parse(savedActiveTool) : 'chat');
        
        const savedMessages = localStorage.getItem(`snipe-study-chat-${activeProject.id}`);
        setMessages(savedMessages ? JSON.parse(savedMessages) : []);
    }, [activeProject.id, setOpenTools, setActiveTool, setMessages]);

    const handleSelectTool = (tool: ToolType) => {
        if (!openTools.includes(tool)) {
            setOpenTools(prev => [...prev, tool]);
        }
        setActiveTool(tool);
        setIsAppGridOpen(false);
    };

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
                projects={projects}
                activeProjectId={activeProject.id}
                onSetActiveProject={onSetActiveProject}
                onCreateProject={onCreateProject}
                onOpenSettings={onOpenSettings}
                isMobile={isMobile}
                isOpen={isMobileSidebarOpen}
                onClose={() => setIsMobileSidebarOpen(false)}
                isCollapsed={!isMobile && isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(p => !p)}
            />
            <main className="flex-1 flex flex-col bg-background-dark min-w-0">
                <Header 
                    project={activeProject} 
                    onDeleteProject={onDeleteProject} 
                    onOpenPomodoro={onOpenPomodoro}
                    onOpenLiveMode={onOpenLiveMode}
                    onOpenCalculator={onOpenCalculator}
                    isMobile={isMobile}
                    onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                />
                <ToolNavbar 
                    openTools={openTools}
                    activeTool={activeTool} 
                    onSelectTool={setActiveTool}
                    onCloseTool={handleCloseTool}
                    onOpenAppGrid={() => setIsAppGridOpen(true)} 
                />
                <div className="flex-1 overflow-hidden">
                    <ProjectDashboard
                      project={activeProject}
                      onUpdateProject={onUpdateProject}
                      activeTool={activeTool}
                      messages={messages}
                      setMessages={setMessages}
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