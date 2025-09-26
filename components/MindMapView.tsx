import React, { useState, useRef, useEffect } from 'react';
import * as geminiService from '../../services/geminiService.ts';
import { Project, MindMapToolData, MindMapNode } from '../../types.ts';
import { Button } from './common/Button.tsx';
import { Spinner } from './common/Spinner.tsx';
import { Tooltip } from './common/Tooltip.tsx';
import { AppSettings } from '../../App.tsx';

interface MindMapViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
  // Fix: Add settings prop to be able to access language preference.
  settings: AppSettings;
}

const getInitialData = (project: Project): MindMapToolData => {
  return project.tools.mind_map || { nodes: [] };
};

const BASE_WIDTH = 1000;
const BASE_HEIGHT = 800;

const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetZoomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4-4l-5 5M4 16v4m0 0h4m-4-4l5-5m11 5v-4m0 0h-4m4 4l-5-5" /></svg>;


export const MindMapView: React.FC<MindMapViewProps> = ({ project, onUpdateProject, settings }) => {
    const [data, setData] = useState<MindMapToolData>(getInitialData(project));
    const [topicInput, setTopicInput] = useState('The Solar System');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    
    // Interaction State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
    
    // Editing State
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (editingNodeId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingNodeId]);

    const updateAndPersist = (newData: MindMapToolData) => {
        setData(newData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, mind_map: newData } }));
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        handleResetView(); // Reset view for new map
        try {
            // Fix: Pass the user's selected language to the mind map generation service.
            const nodes = await geminiService.generateMindMap(topicInput, settings.language);
            updateAndPersist({ nodes });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDownload = () => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mind-map-${topicInput.replace(/\s+/g, '_')}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --- Interaction Handlers ---
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const svg = svgRef.current;
        if (!svg) return;

        const scaleAmount = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(zoom * (1 + scaleAmount), 0.2), 3);
        
        const pt = new DOMPoint(e.clientX, e.clientY);
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        setPan({
            x: svgP.x - (svgP.x - pan.x) * (newZoom / zoom),
            y: svgP.y - (svgP.y - pan.y) * (newZoom / zoom),
        });
        setZoom(newZoom);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === svgRef.current) {
            setIsPanning(true);
            panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: pan.x, panY: pan.y };
            if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && svgRef.current) {
            const svgRect = svgRef.current.getBoundingClientRect();
            const scale = (BASE_WIDTH * zoom) / svgRect.width;
            
            const dx = e.clientX - panStartRef.current.clientX;
            const dy = e.clientY - panStartRef.current.clientY;
            
            setPan({
                x: panStartRef.current.panX - dx * scale,
                y: panStartRef.current.panY - dy * scale,
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        if (svgRef.current) svgRef.current.style.cursor = 'grab';
    };
    
    // --- Editing Handlers ---

    const handleDoubleClick = (node: MindMapNode) => {
        setEditingNodeId(node.id);
        setEditText(node.text);
    };

    const handleSaveEdit = () => {
        if (editingNodeId === null || editText.trim() === '') {
            setEditingNodeId(null);
            return;
        };
        const newNodes = data.nodes.map(n => 
            n.id === editingNodeId ? { ...n, text: editText } : n
        );
        updateAndPersist({ nodes: newNodes });
        setEditingNodeId(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveEdit();
        }
        if (e.key === 'Escape') {
            setEditingNodeId(null);
        }
    };

    // --- Control Handlers ---

    const handleZoomControl = (direction: 'in' | 'out') => {
        const scaleAmount = direction === 'in' ? -0.2 : 0.2;
        const newZoom = Math.min(Math.max(zoom * (1 + scaleAmount), 0.2), 3);
        const centerX = pan.x + (BASE_WIDTH * zoom) / 2;
        const centerY = pan.y + (BASE_HEIGHT * zoom) / 2;
        
        setPan({
            x: centerX - (BASE_WIDTH * newZoom) / 2,
            y: centerY - (BASE_HEIGHT * newZoom) / 2,
        });
        setZoom(newZoom);
    };

    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const findNodeById = (id: string) => data.nodes.find(n => n.id === id);

    if (data.nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
                <div className="w-full h-full sm:h-auto sm:max-w-md p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg text-center flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-text-primary mb-4">AI Mind Map Generator</h2>
                    <p className="text-text-secondary mb-6">Enter a topic to visualize connections and ideas.</p>
                    <div className="space-y-4">
                        <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="e.g., The Renaissance" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
                        <Button onClick={handleGenerate} disabled={isLoading || !topicInput.trim()} size="lg" className="w-full">
                            {isLoading ? <Spinner /> : 'Generate Mind Map'}
                        </Button>
                    </div>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full bg-background-darkest relative overflow-hidden">
            <svg
                ref={svgRef}
                className="w-full h-full cursor-grab"
                viewBox={`${pan.x} ${pan.y} ${BASE_WIDTH * zoom} ${BASE_HEIGHT * zoom}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Lines */}
                {data.nodes.map(node => {
                    if (node.parentId) {
                        const parent = findNodeById(node.parentId);
                        if (parent) {
                            return (
                                <line
                                    key={`line-${node.id}`}
                                    x1={parent.x} y1={parent.y}
                                    x2={node.x} y2={node.y}
                                    stroke="var(--border-color)"
                                    strokeWidth="2"
                                />
                            );
                        }
                    }
                    return null;
                })}
                {/* Nodes */}
                {data.nodes.map(node => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onDoubleClick={() => handleDoubleClick(node)} className="mindmap-node">
                        <rect x="-60" y="-20" width="120" height="40" rx="10" fill={!node.parentId ? "var(--brand-primary)" : "var(--overlay)"} stroke="var(--border-color)" strokeWidth="1" className="transition-all" />
                        {editingNodeId === node.id ? (
                           <foreignObject x="-60" y="-20" width="120" height="40" onMouseDown={e => e.stopPropagation()}>
                                <div className="w-full h-full">
                                    <input 
                                        ref={inputRef}
                                        type="text"
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={handleEditKeyDown}
                                        className="w-full h-full bg-background-light text-text-primary text-center text-xs border-2 border-brand-primary rounded-[10px] p-1 outline-none"
                                    />
                                </div>
                            </foreignObject>
                        ) : (
                             <text x="0" y="5" className="mindmap-node-text" textAnchor="middle" fontSize="12" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                                {node.text}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
            <div className="absolute bottom-4 right-4 flex gap-2">
                <Button onClick={handleDownload} variant="secondary">Download SVG</Button>
                <Button onClick={() => updateAndPersist({ nodes: [] })} variant="secondary">New Map</Button>
            </div>
             <div className="absolute bottom-4 left-4 flex flex-col gap-1 bg-surface p-1 rounded-lg shadow-lg">
                <Tooltip content="Zoom In" position="right">
                    <Button onClick={() => handleZoomControl('in')} variant="secondary" size="sm" className="p-2 aspect-square"><ZoomInIcon /></Button>
                </Tooltip>
                 <Tooltip content="Reset View" position="right">
                    <Button onClick={handleResetView} variant="secondary" size="sm" className="p-2 aspect-square"><ResetZoomIcon /></Button>
                </Tooltip>
                 <Tooltip content="Zoom Out" position="right">
                    <Button onClick={() => handleZoomControl('out')} variant="secondary" size="sm" className="p-2 aspect-square"><ZoomOutIcon /></Button>
                </Tooltip>
            </div>
            <style>{`
                .mindmap-node > rect {
                    transition: stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out;
                }
                .mindmap-node:hover > rect {
                    stroke: var(--brand-secondary);
                    stroke-width: 2px;
                }
            `}</style>
        </div>
    );
};