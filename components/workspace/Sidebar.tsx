import React, { useState, useMemo } from 'react';
import { Project, ChatSession, ToolType } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Tooltip } from '../common/Tooltip.tsx';
import { Modal } from '../common/Modal.tsx';
import { AppSettings } from '../../App.tsx';
import { getTranslator } from '../../services/translator.ts';
import { v4 as uuidv4 } from 'uuid';

// Icons
const SettingsIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.982.54 2.295 0 3.277-1.372.836-.836 2.942 2.106 2.106a1.532 1.532 0 012.286.948c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 010-3.277c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.286-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>);
const CollapseIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /><path fillRule="evenodd" d="M8.707 5.293a1 1 0 010 1.414L5.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>);
const EduCompanionIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="icon-gradient-sidebar" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="var(--brand-primary)" /><stop offset="100%" stopColor="var(--brand-secondary)" /></linearGradient></defs><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="url(#icon-gradient-sidebar)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 7L12 12L22 7" stroke="url(#icon-gradient-sidebar)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 12V22" stroke="url(#icon-gradient-sidebar)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ChatIcon = (p:any) => <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const DeleteIcon = (p:any) => <svg {...p} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;

interface SidebarProps {
    projects: Project[];
    activeProjectId: string;
    onSetActiveProject: (id: string) => void;
    onCreateProject: (name: string) => void;
    onOpenSettings: () => void;
    isMobile: boolean;
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    settings: AppSettings;
    activeProject: Project;
    onUpdateProject: (updater: (project: Project) => Project) => void;
}

const NewProjectModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (name: string) => void; t: (key: string) => string; }> = ({ isOpen, onClose, onCreate, t }) => {
    const [name, setName] = useState('');
    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
            onClose();
        }
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('sidebar.modal.title')}>
            <div className="space-y-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-text-secondary">{t('sidebar.modal.label')}</label>
                <input id="projectName" type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder={t('sidebar.modal.placeholder')} className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary" />
                <div className="flex justify-end gap-2">
                    <Button onClick={onClose} variant="secondary">{t('sidebar.modal.cancel')}</Button>
                    <Button onClick={handleCreate}>{t('sidebar.modal.create')}</Button>
                </div>
            </div>
        </Modal>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ projects, activeProjectId, onSetActiveProject, onCreateProject, onOpenSettings, isMobile, isOpen, onClose, isCollapsed, onToggleCollapse, settings, activeProject, onUpdateProject }) => {
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const { t } = getTranslator(settings.language);

    const handleNewChat = () => {
        onUpdateProject(currentProject => {
            if (!currentProject.tools.chat) return currentProject;
            const newSessionId = uuidv4();
            const newSession: ChatSession = {
                id: newSessionId,
                title: `Chat ${Object.keys(currentProject.tools.chat.sessions).length + 1}`,
                messages: [],
                createdAt: new Date().toISOString(),
            };
            return {
                ...currentProject,
                tools: {
                    ...currentProject.tools,
                    chat: {
                        ...currentProject.tools.chat,
                        sessions: { ...currentProject.tools.chat.sessions, [newSessionId]: newSession },
                        activeSessionId: newSessionId,
                    }
                }
            };
        });
        if (isMobile) onClose();
    };

    const handleDeleteChat = (sessionId: string) => {
        onUpdateProject(currentProject => {
            if (!currentProject.tools.chat) return currentProject;
            const { sessions, activeSessionId } = currentProject.tools.chat;
            if (Object.keys(sessions).length <= 1) return currentProject;
            
            const newSessions = { ...sessions };
            delete newSessions[sessionId];
            
            const newActiveSessionId = sessionId === activeSessionId
                ? Object.keys(newSessions).sort((a,b) => new Date(newSessions[b].createdAt).getTime() - new Date(newSessions[a].createdAt).getTime())[0]
                : activeSessionId;

            return {
                ...currentProject,
                tools: {
                    ...currentProject.tools,
                    chat: {
                        ...currentProject.tools.chat,
                        sessions: newSessions,
                        activeSessionId: newActiveSessionId,
                    }
                }
            };
        });
    };

    const handleSwitchChat = (sessionId: string) => {
        onUpdateProject(currentProject => {
            if (!currentProject.tools.chat || currentProject.tools.chat.activeSessionId === sessionId) return currentProject;
            return {
                ...currentProject,
                tools: {
                    ...currentProject.tools,
                    chat: {
                        ...currentProject.tools.chat,
                        activeSessionId: sessionId
                    }
                }
            };
        });
        if (isMobile) onClose();
    };

    const sortedProjects = useMemo(() => [...projects].sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()), [projects]);
    const chatSessions = activeProject.tools.chat?.sessions || {};
    // FIX: Cast Object.values to the correct type, as TypeScript infers unknown[].
    const sortedSessions: ChatSession[] = (Object.values(chatSessions) as ChatSession[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const sidebarContent = (
        <div className={`bg-surface text-text-primary h-full flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16 items-center' : 'w-64'}`}>
            <div className={`p-4 flex items-center flex-shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && <div className="flex items-center gap-2"><EduCompanionIcon /> <span className="font-bold">EduCompanion</span></div>}
                {!isMobile && (
                    <Tooltip content={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')} position="right">
                        <Button onClick={onToggleCollapse} variant="ghost" size="sm" className={`p-2 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}><CollapseIcon /></Button>
                    </Tooltip>
                )}
            </div>
            
            <div className="px-2 flex-shrink-0">
                <select value={activeProjectId} onChange={e => { onSetActiveProject(e.target.value); if (isMobile) onClose(); }} className={`w-full bg-overlay p-2 rounded-md border border-border-color text-sm truncate ${isCollapsed ? 'hidden' : ''}`}>
                    {sortedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            
            <div className="p-2 flex-shrink-0">
                <Tooltip content={t('sidebar.newProject')} position="right" disabled={!isCollapsed}>
                    <Button onClick={() => { setIsProjectModalOpen(true); if (isMobile) onClose(); }} variant="secondary" className="w-full">
                        <PlusIcon /> {!isCollapsed && <span className="ml-2">{t('sidebar.newProject')}</span>}
                    </Button>
                </Tooltip>
            </div>

            <div className="flex-grow overflow-y-auto px-2 mt-2 border-t border-border-color pt-2">
                <div className={`flex items-center justify-between mb-2 ${isCollapsed ? 'hidden' : ''}`}>
                    <h3 className="text-xs font-semibold uppercase text-text-secondary px-2">Chats</h3>
                    <Tooltip content="New Chat" position="top">
                        <Button onClick={handleNewChat} variant="ghost" size="sm" className="p-1"><PlusIcon/></Button>
                    </Tooltip>
                </div>
                 {sortedSessions.map(session => (
                    <Tooltip key={session.id} content={session.title} position="right" disabled={!isCollapsed}>
                        <div
                            onClick={() => handleSwitchChat(session.id)}
                            className={`group flex items-center p-2 rounded-md cursor-pointer text-sm mb-1 truncate ${activeProject.tools.chat?.activeSessionId === session.id ? 'active-sidebar-link' : 'hover:bg-overlay'}`}
                        >
                            <ChatIcon className="h-4 w-4 flex-shrink-0" />
                            {!isCollapsed && <span className="ml-3 flex-1 truncate">{session.title}</span>}
                            {!isCollapsed && Object.keys(chatSessions).length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(session.id); }} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger p-1 rounded-full">
                                    <DeleteIcon />
                                </button>
                            )}
                        </div>
                    </Tooltip>
                ))}
            </div>

            <div className="p-2 flex-shrink-0 border-t border-border-color">
                <Tooltip content={settings.username} position="right" disabled={!isCollapsed}>
                    <div className="flex items-center p-2">
                        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold flex-shrink-0">{settings.username.charAt(0)}</div>
                        {!isCollapsed && <span className="ml-3 text-sm font-semibold truncate">{settings.username}</span>}
                    </div>
                </Tooltip>
                <Tooltip content={t('sidebar.settings')} position="right" disabled={!isCollapsed}>
                    <Button onClick={() => { onOpenSettings(); if (isMobile) onClose(); }} variant="ghost" className="w-full justify-start">
                        <SettingsIcon />
                        {!isCollapsed && <span className="ml-3">{t('sidebar.settings')}</span>}
                    </Button>
                </Tooltip>
            </div>
             <NewProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onCreate={onCreateProject} t={t} />
        </div>
    );
    
    if (isMobile) {
        return (
            <>
                {isOpen && <div className="sidebar-mobile-overlay" onClick={onClose}></div>}
                <div className={`sidebar-mobile ${isOpen ? 'is-open' : ''}`}>
                    {sidebarContent}
                </div>
            </>
        );
    }

    return sidebarContent;
};