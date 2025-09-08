import React from 'react';
import { Project } from '../../types';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip.tsx';

const SettingsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.982.54 2.295 0 3.277-1.372.836-.836 2.942 2.106 2.106a1.532 1.532 0 012.286.948c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 010-3.277c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.286-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
);
const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
);
const CollapseIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M8.707 5.293a1 1 0 010 1.414L5.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);
const ExpandIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M11.293 14.707a1 1 0 010-1.414L14.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);
const SnipeStudyIconSmall: React.FC = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12L22 7" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12V22" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
         <path d="M2 7L12 12" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSetActiveProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onOpenSettings: () => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Fix: Included 'isMobile' in props for SidebarContent to resolve compilation errors.
const SidebarContent: React.FC<SidebarProps> = ({ 
  projects, activeProjectId, onSetActiveProject, onCreateProject, 
  onOpenSettings, onClose, isCollapsed, onToggleCollapse, isMobile 
}) => {
  
  const handleCreateProject = () => {
    const name = prompt("Enter new project name:");
    if (name) {
      onCreateProject(name);
      onClose?.();
    }
  };

  const sortedProjects = [...projects].sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-surface flex flex-col flex-shrink-0 border-r border-border-color h-full transition-all duration-300 ease-in-out`}>
      <div className={`p-4 border-b border-border-color flex items-center h-[65px] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <h1 className="text-xl font-bold text-text-primary">SnipeStudy</h1>
        ) : (
          <SnipeStudyIconSmall />
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!isCollapsed && <h2 className="text-xs font-bold uppercase text-text-secondary px-2 mb-2">Projects</h2>}
        <nav className="flex flex-col gap-1">
          {sortedProjects.map(project => (
            <Tooltip key={project.id} content={project.name} position="right" disabled={!isCollapsed}>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onSetActiveProject(project.id); onClose?.(); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors truncate ${isCollapsed ? 'justify-center' : ''} ${
                  activeProjectId === project.id 
                  ? 'bg-brand-primary/20 text-brand-primary font-semibold' 
                  : 'text-text-secondary hover:bg-overlay hover:text-text-primary'
                }`}
              >
                {isCollapsed ? (
                  <span className="w-6 h-6 rounded-full bg-overlay flex items-center justify-center text-xs font-bold">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  project.name
                )}
              </a>
            </Tooltip>
          ))}
        </nav>
      </div>
      <div className="p-2 border-t border-border-color">
        <Tooltip content="New Project" position="right" disabled={!isCollapsed}>
          <Button 
            onClick={handleCreateProject}
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}
          >
            <PlusIcon />
            {!isCollapsed && 'New Project'}
          </Button>
        </Tooltip>
        <Tooltip content="Settings" position="right" disabled={!isCollapsed}>
          <Button 
            onClick={() => { onOpenSettings(); onClose?.(); }}
            variant="ghost"
            className={`w-full ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            leftIcon={<SettingsIcon />}
          >
            {!isCollapsed && 'Settings'}
          </Button>
        </Tooltip>
        {/* Fix: Use destructured 'isMobile' prop instead of 'props.isMobile' to fix 'props' is not defined error. */}
         {!isMobile && onToggleCollapse && (
          <Tooltip content={isCollapsed ? "Expand" : "Collapse"} position="right" disabled={!isCollapsed}>
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              className={`w-full mt-2 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              leftIcon={isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
            >
              {!isCollapsed && 'Collapse'}
            </Button>
          </Tooltip>
         )}
      </div>
    </aside>
  );
};

const Sidebar: React.FC<SidebarProps> = (props) => {
    if (props.isMobile) {
        return (
            <>
                {props.isOpen && <div className="sidebar-mobile-overlay" onClick={props.onClose} />}
                <div className={`sidebar-mobile ${props.isOpen ? 'is-open' : ''}`}>
                    <SidebarContent {...props} isCollapsed={false} />
                </div>
            </>
        )
    }

    return <SidebarContent {...props} />;
}

export default Sidebar;