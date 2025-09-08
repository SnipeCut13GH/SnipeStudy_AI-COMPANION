

import React, { useState } from 'react';
import * as geminiService from '../services/geminiService.ts';
import { Project, MindMapToolData, MindMapNode } from '../types.ts';
import { Button } from './common/Button.tsx';
import { Spinner } from './common/Spinner.tsx';

interface MindMapViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): MindMapToolData => {
  return project.tools.mind_map || { nodes: [] };
};

export const MindMapView: React.FC<MindMapViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<MindMapToolData>(getInitialData(project));
    const [topicInput, setTopicInput] = useState('The Solar System');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const updateAndPersist = (newData: MindMapToolData) => {
        setData(newData);
        onUpdateProject({ ...project, tools: { ...project.tools, mind_map: newData } });
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const nodes = await geminiService.generateMindMap(topicInput);
            updateAndPersist({ nodes });
        } catch (err: any) {
            setError(`Failed to generate mind map: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
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
        <div className="w-full h-full bg-background-darkest relative overflow-auto">
            <svg className="min-w-full min-h-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
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
                                    stroke="#4A5568"
                                    strokeWidth="2"
                                />
                            );
                        }
                    }
                    return null;
                })}
                {/* Nodes */}
                {data.nodes.map(node => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                        <rect x="-60" y="-20" width="120" height="40" rx="10" fill={!node.parentId ? "#3B82F6" : "#374151"} stroke="#4B5563" strokeWidth="1" />
                        <text x="0" y="5" fill="white" textAnchor="middle" fontSize="12" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                            {node.text}
                        </text>
                    </g>
                ))}
            </svg>
            <Button onClick={() => updateAndPersist({ nodes: [] })} className="absolute bottom-4 right-4" variant="secondary">
                Generate New Map
            </Button>
        </div>
    );
};