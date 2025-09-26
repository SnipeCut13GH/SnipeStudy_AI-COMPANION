import React, { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, KanbanToolData, KanbanColumn, KanbanTask } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';
import { AppSettings } from '../../App.tsx';

interface KanbanViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  // Fix: Add settings prop to be able to access language preference.
  settings: AppSettings;
}

const getInitialData = (project: Project): KanbanToolData => {
  return project.tools.kanban || {
    tasks: {},
    columns: {
      'col-1': { id: 'col-1', title: 'To Do', taskIds: [] },
      'col-2': { id: 'col-2', title: 'In Progress', taskIds: [] },
      'col-3': { id: 'col-3', title: 'Done', taskIds: [] },
    },
    columnOrder: ['col-1', 'col-2', 'col-3'],
  };
};

const AddTaskForm: React.FC<{
    onAddTask: (content: string) => void;
    onCancel: () => void;
}> = ({ onAddTask, onCancel }) => {
    const [content, setContent] = useState('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const handleSubmit = () => {
        if (content.trim()) {
            onAddTask(content.trim());
            setContent('');
        }
    };

    return (
        <div className="p-1 space-y-2">
            <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter task content..."
                className="w-full bg-background-darkest border border-border-color p-2 rounded-md text-sm text-text-primary resize-none"
                rows={3}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <div className="flex gap-2">
                <Button onClick={handleSubmit} size="sm">Add Task</Button>
                <Button onClick={onCancel} size="sm" variant="ghost">Cancel</Button>
            </div>
        </div>
    );
};

export const KanbanView: React.FC<KanbanViewProps> = ({ project, onUpdateProject, settings }) => {
  const [data, setData] = useState<KanbanToolData>(getInitialData(project));
  const [addingTaskToColumn, setAddingTaskToColumn] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [editText, setEditText] = useState('');
  
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genGoal, setGenGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const [draggedItem, setDraggedItem] = useState<{ taskId: string; sourceColId: string } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  React.useEffect(() => {
    if(editingTask && editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
    }
  }, [editingTask]);

  const updateAndPersist = (newData: KanbanToolData) => {
    setData(newData);
    onUpdateProject(p => ({ ...p, tools: { ...p.tools, kanban: newData } }));
  };

  const handleAddTask = (columnId: string, content: string) => {
    const newTaskId = uuidv4();
    const newTask: KanbanTask = { id: newTaskId, content };
    const newTasks = { ...data.tasks, [newTaskId]: newTask };
    const column = data.columns[columnId];
    const newTaskIds = [...column.taskIds, newTaskId];
    const newColumns = { ...data.columns, [columnId]: { ...column, taskIds: newTaskIds } };
    
    updateAndPersist({ ...data, tasks: newTasks, columns: newColumns });
    setAddingTaskToColumn(null);
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditingTask(task);
    setEditText(task.content);
  }

  const handleSaveEdit = () => {
    if(!editingTask) return;
    const newTasks = { ...data.tasks, [editingTask.id]: { ...editingTask, content: editText }};
    updateAndPersist({ ...data, tasks: newTasks });
    setEditingTask(null);
  }
  
  const handleDeleteTask = (taskId: string, columnId: string) => {
    const newTasks = { ...data.tasks };
    delete newTasks[taskId];

    const column = data.columns[columnId];
    const newTaskIds = column.taskIds.filter(id => id !== taskId);
    const newColumns = { ...data.columns, [columnId]: { ...column, taskIds: newTaskIds } };

    updateAndPersist({ ...data, tasks: newTasks, columns: newColumns });
  }
  
  const handleGeneratePlan = async () => {
    if (!genGoal.trim()) return;
    setIsGenerating(true);
    setGenError(null);
    try {
        // Fix: Pass the user's selected language to the kanban plan generation service.
        const { tasks: newAiTasks } = await geminiService.generateKanbanPlan(genGoal, settings.language);

        if (newAiTasks && Object.keys(newAiTasks).length > 0) {
            const newAiTaskIds = Object.keys(newAiTasks);
            const mergedTasks = { ...data.tasks, ...newAiTasks };
            
            const todoColumnId = data.columnOrder[0];
            const todoColumn = data.columns[todoColumnId];
            const updatedTaskIds = [...todoColumn.taskIds, ...newAiTaskIds];
            
            const updatedColumns = {
                ...data.columns,
                [todoColumnId]: { ...todoColumn, taskIds: updatedTaskIds },
            };
            
            updateAndPersist({ ...data, tasks: mergedTasks, columns: updatedColumns });
            setIsGenModalOpen(false);
            setGenGoal('');
        } else {
            throw new Error("The AI returned no tasks. Please try a different goal.");
        }
    } catch (error: any) {
        console.error("Failed to generate plan", error);
        setGenError(error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDragStart = (taskId: string, sourceColId: string) => {
    setDraggedItem({ taskId, sourceColId });
  };

  const handleDrop = (targetColId: string) => {
    if (!draggedItem || draggedItem.sourceColId === targetColId) {
      setDraggedItem(null);
      setDragOverCol(null);
      return;
    }

    const { taskId, sourceColId } = draggedItem;

    const sourceCol = data.columns[sourceColId];
    const sourceTaskIds = sourceCol.taskIds.filter(id => id !== taskId);

    const targetCol = data.columns[targetColId];
    const targetTaskIds = [...targetCol.taskIds, taskId];
    
    const newColumns = {
      ...data.columns,
      [sourceColId]: { ...sourceCol, taskIds: sourceTaskIds },
      [targetColId]: { ...targetCol, taskIds: targetTaskIds },
    };

    updateAndPersist({ ...data, columns: newColumns });
    setDraggedItem(null);
    setDragOverCol(null);
  };


  return (
    <div className="w-full h-full flex flex-col p-4 bg-background-darkest overflow-auto">
      <div className="flex-shrink-0 mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">Tasks</h2>
        <Button onClick={() => { setIsGenModalOpen(true); setGenError(null); }} variant="secondary">Plan with AI</Button>
      </div>
      <div className="kanban-container flex-grow flex gap-4">
        {data.columnOrder.map(columnId => {
          const column = data.columns[columnId];
          const tasks = column.taskIds.map(taskId => data.tasks[taskId]).filter(Boolean);

          return (
            <div 
              key={column.id} 
              className={`kanban-column w-72 bg-surface rounded-lg p-2 flex flex-col flex-shrink-0 transition-colors ${dragOverCol === column.id ? 'bg-brand-primary/10' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(column.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(column.id)}
            >
              <h3 className="font-semibold px-2 py-1 mb-2">{column.title} <span className="text-sm text-text-secondary">{tasks.length}</span></h3>
              <div className="flex-grow space-y-2 overflow-y-auto p-1 min-h-[100px]">
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`group relative bg-background-dark p-3 rounded-md shadow text-sm cursor-grab ${draggedItem?.taskId === task.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(task.id, column.id)}
                    onClick={() => handleEditTask(task)}
                  >
                    {editingTask?.id === task.id ? (
                        <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleSaveEdit(); if(e.key === 'Escape') setEditingTask(null); }}
                            className="w-full bg-overlay border border-border-color p-2 rounded-md text-sm text-text-primary resize-none"
                            rows={3}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            {task.content}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, column.id); }} className="absolute top-1 right-1 p-1 rounded-full bg-background-dark text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-danger hover:text-white transition-opacity text-xs">&times;</button>
                        </>
                    )}
                  </div>
                ))}
              </div>
              {addingTaskToColumn === column.id ? (
                  <AddTaskForm 
                      onAddTask={(content) => handleAddTask(column.id, content)}
                      onCancel={() => setAddingTaskToColumn(null)}
                  />
              ) : (
                  <Button onClick={() => setAddingTaskToColumn(column.id)} size="sm" variant="ghost" className="mt-2 w-full">
                      + Add Task
                  </Button>
              )}
            </div>
          );
        })}
      </div>
      {isGenModalOpen && (
        <Modal isOpen={isGenModalOpen} onClose={() => setIsGenModalOpen(false)} title="Plan with AI">
            <div className="space-y-4">
                <p className="text-text-secondary">Describe your project goal, and the AI will generate starting tasks for your 'To Do' list.</p>
                <input
                    type="text"
                    value={genGoal}
                    onChange={e => setGenGoal(e.target.value)}
                    placeholder="e.g., Launch a new marketing campaign"
                    className="w-full bg-background-dark border border-border-color p-2 rounded-md text-text-primary"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleGeneratePlan(); }}
                />
                {genError && <p className="text-danger text-sm">{genError}</p>}
                <div className="flex justify-end gap-2 pt-2">
                    <Button onClick={() => setIsGenModalOpen(false)} variant="secondary">Cancel</Button>
                    <Button onClick={handleGeneratePlan} disabled={isGenerating || !genGoal.trim()}>
                        {isGenerating ? <Spinner /> : 'Generate Plan'}
                    </Button>
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
};