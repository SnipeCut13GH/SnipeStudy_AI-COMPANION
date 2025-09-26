import React, { useState, useRef, useEffect, TouchEvent, MouseEvent } from 'react';
import * as geminiService from '../services/geminiService.ts';
import { Project, MindMapToolData, MindMapNode } from '../types.ts';
import { Button } from './common/Button.tsx';
import { Spinner } from './common/Spinner.tsx';
import { Tooltip } from './common/Tooltip.tsx';
import { AppSettings } from '../App.tsx';

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

const getClientCoords = (e: React.MouseEvent | React.TouchEvent | globalThis.MouseEvent | globalThis.TouchEvent) => {
    if ('touches' in e) {
        return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
};

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

    const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
        if ((e.target as SVGSVGElement) === svgRef.current) {
            e.preventDefault();
            setIsPanning(true);
            const { clientX, clientY } = getClientCoords(e);
            panStartRef.current = { clientX, clientY, panX: pan.x, panY: pan.y };
            if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
        }
    };
    
    useEffect(() => {
        const handlePanMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
            if (!isPanning) return;
            
            const { clientX, clientY } = getClientCoords(e);
            const dx = clientX - panStartRef.current.clientX;
            const dy = clientY - panStartRef.current.clientY;
            
            setPan({
                x: panStartRef.current.panX - dx / zoom,
                y: panStartRef.current.panY - dy / zoom,
            });
        };

        const handlePanEnd = () => {
            setIsPanning(false);
            if (svgRef.current) svgRef.current.style.cursor = 'grab';
        };

        window.addEventListener('mousemove', handlePanMove);
        window.addEventListener('touchmove', handlePanMove, { passive: false });
        window.addEventListener('mouseup', handlePanEnd);
        window.addEventListener('touchend', handlePanEnd);

        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('touchmove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
            window.removeEventListener('touchend', handlePanEnd);
        };
    }, [isPanning, pan, zoom]);

    const handleZoomButton = (direction: 'in' | 'out') => {
        const scaleAmount = direction === 'in' ? 0.2 : -0.2;
        const newZoom = Math.min(Math.max(zoom * (1 + scaleAmount), 0.2), 3);
        setZoom(newZoom);
    };
    
    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };
    
    const handleEditStart = (node: MindMapNode) => {
        setEditingNodeId(node.id);
        setEditText(node.text);
    };
    
    const handleEditSave = () => {
        if (!editingNodeId) return;
        const newNodes = data.nodes.map(n => n.id === editingNodeId ? { ...n, text: editText } : n);
        updateAndPersist({ nodes: newNodes });
        setEditingNodeId(null);
    };

    if (data.nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
                <div className="w-full h-full sm:h-auto sm:max-w-md p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg text-center flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-text-primary mb-4">AI Mind Map Generator</h2>
                    <p className="text-text-secondary mb-6">Enter a topic and the AI will generate a visual mind map for you.</p>
                    <div className="space-y-4">
                        <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleGenerate()} placeholder="e.g., The Solar System" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
                        <Button onClick={handleGenerate} disabled={isLoading || !topicInput.trim()} size="lg" className="w-full">
                            {isLoading ? <Spinner /> : 'Generate Mind Map'}
                        </Button>
                    </div>
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
            </div>
        );
    }
    
    const rootNode = data.nodes.find(n => !n.parentId);
    
    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
            <div className="p-2 border-b border-border-color flex-shrink-0 flex items-center justify-between bg-surface">
                <Button onClick={() => updateAndPersist({ nodes: [] })} variant="secondary" size="sm">Generate New Map</Button>
                <div className="flex items-center gap-2">
                    <Tooltip content="Zoom In"><Button onClick={() => handleZoomButton('in')} size="sm" variant="secondary" className="p-2"><ZoomInIcon /></Button></Tooltip>
                    <Tooltip content="Zoom Out"><Button onClick={() => handleZoomButton('out')} size="sm" variant="secondary" className="p-2"><ZoomOutIcon /></Button></Tooltip>
                    <Tooltip content="Reset View"><Button onClick={handleResetView} size="sm" variant="secondary" className="p-2"><ResetZoomIcon /></Button></Tooltip>
                </div>
                <Button onClick={handleDownload} size="sm">Download SVG</Button>
            </div>
            <div className="flex-grow relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab"
                    onWheel={handleWheel}
                    onMouseDown={handlePanStart}
                    onTouchStart={handlePanStart}
                >
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-color)" />
                        </marker>
                    </defs>
                    <g transform={`scale(${zoom}) translate(${-pan.x}, ${-pan.y})`}>
                        {data.nodes.map(node => {
                            const parent = data.nodes.find(p => p.id === node.parentId);
                            return parent && (
                                <line
                                    key={`line-${node.id}`}
                                    x1={parent.x} y1={parent.y}
                                    x2={node.x} y2={node.y}
                                    stroke="var(--border-color)"
                                    strokeWidth="2"
                                />
                            );
                        })}
                        {data.nodes.map(node => (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onDoubleClick={() => handleEditStart(node)}>
                                <rect
                                    x={-75} y={-25}
                                    width={150} height={50}
                                    rx={10}
                                    fill={node.id === rootNode?.id ? 'var(--brand-primary)' : 'var(--overlay)'}
                                    stroke={node.id === rootNode?.id ? 'var(--brand-secondary)' : 'var(--border-color)'}
                                    strokeWidth="2"
                                />
                                {editingNodeId === node.id ? (
                                    <foreignObject x={-70} y={-20} width={140} height={40}>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={editText}
                                            onChange={e => setEditText(e.target.value)}
                                            onBlur={handleEditSave}
                                            onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                                            className="w-full h-full bg-transparent text-center text-white p-1 focus:outline-none"
                                        />
                                    </foreignObject>
                                ) : (
                                    <text
                                        textAnchor="middle" dominantBaseline="middle"
                                        fill="#FFFFFF"
                                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                                    >
                                        {node.text}
                                    </text>
                                )}
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
};