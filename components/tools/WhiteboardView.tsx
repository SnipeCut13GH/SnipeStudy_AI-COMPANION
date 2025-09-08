import React, { useState, useRef, MouseEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Fix: Correct import path for types.
import { Project, WhiteboardToolData, WhiteboardDrawing } from '../../types.ts';
import { Button } from '../common/Button';

interface WhiteboardViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): WhiteboardToolData => {
  return project.tools.whiteboard || { drawings: [] };
};

const COLORS = ['#FFFFFF', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7'];

function getCoordinatesInSvg(svg: SVGSVGElement, event: MouseEvent): [number, number] {
    const pt = new DOMPoint(event.clientX, event.clientY);
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return [svgPt.x, svgPt.y];
}

function createSvgPath(points: [number, number][]): string {
    if (points.length < 2) {
        // Create a dot for a single point click
        return points.length === 1 ? `M ${points[0][0]-0.5} ${points[0][1]} A 0.5 0.5 0 1 0 ${points[0][0]} ${points[0][1]}` : '';
    }
    let d = `M ${points[0][0]} ${points[0][1]}`;
    points.forEach(point => {
        d += ` L ${point[0]} ${point[1]}`;
    });
    return d;
}

export const WhiteboardView: React.FC<WhiteboardViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<WhiteboardToolData>(getInitialData(project));
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<[number, number][]>([]);
    const [color, setColor] = useState('#FFFFFF');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const svgRef = useRef<SVGSVGElement>(null);

    const updateAndPersist = (newData: WhiteboardToolData) => {
        setData(newData);
        onUpdateProject({ ...project, tools: { ...project.tools, whiteboard: newData } });
    };

    const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return;
        setIsDrawing(true);
        const coords = getCoordinatesInSvg(svgRef.current, e);
        setCurrentPath([coords]);
    };

    const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
        if (!isDrawing || !svgRef.current) return;
        const coords = getCoordinatesInSvg(svgRef.current, e);
        setCurrentPath(prev => [...prev, coords]);
    };

    const handleMouseUp = () => {
        if (!isDrawing || currentPath.length === 0) return;
        setIsDrawing(false);
        const newDrawing: WhiteboardDrawing = {
            id: uuidv4(),
            path: currentPath,
            color,
            strokeWidth,
        };
        updateAndPersist({ drawings: [...data.drawings, newDrawing] });
        setCurrentPath([]);
    };
    
    const handleUndo = () => {
        if (data.drawings.length === 0) return;
        updateAndPersist({ drawings: data.drawings.slice(0, -1) });
    };

    const handleClear = () => {
        if (data.drawings.length === 0) return;
        updateAndPersist({ drawings: [] });
    };

    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
            <div className="p-2 border-b border-border-color flex-shrink-0 flex items-center justify-between bg-surface">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-white' : ''}`} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                        <label htmlFor="stroke-width" className="text-xs">Size:</label>
                        <input id="stroke-width" type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-24" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleUndo} size="sm" variant="secondary" disabled={data.drawings.length === 0}>Undo</Button>
                    <Button onClick={handleClear} size="sm" variant="danger" disabled={data.drawings.length === 0}>Clear All</Button>
                </div>
            </div>
            <div className="flex-grow relative overflow-hidden">
                <svg
                    ref={svgRef}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {data.drawings.map(drawing => (
                        <path
                            key={drawing.id}
                            d={createSvgPath(drawing.path)}
                            stroke={drawing.color}
                            strokeWidth={drawing.strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                    {isDrawing && currentPath.length > 0 && (
                        <path
                            d={createSvgPath(currentPath)}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                </svg>
            </div>
        </div>
    );
};