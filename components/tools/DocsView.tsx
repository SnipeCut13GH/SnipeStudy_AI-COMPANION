import React, { useState } from 'react';
import { Project, DocsToolData } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';

interface DocumentAnalyzerViewProps {
    project: Project;
    onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): DocsToolData => {
    return project.tools.docs || {
        inputText: '',
        analysisResult: null,
        analysisType: null,
    };
};

export const DocsView: React.FC<DocumentAnalyzerViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<DocsToolData>(getInitialData(project));
    const [isLoading, setIsLoading] = useState(false);
    
    const updateAndPersist = (newData: Partial<DocsToolData>) => {
        const updatedData = { ...data, ...newData };
        setData(updatedData as DocsToolData);
        onUpdateProject({ ...project, tools: { ...project.tools, docs: updatedData as DocsToolData } });
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateAndPersist({ inputText: e.target.value });
    };

    const handleAnalyze = async (type: 'summary' | 'keyPoints' | 'simple') => {
        if (!data.inputText.trim()) return;
        setIsLoading(true);
        updateAndPersist({ analysisResult: null, analysisType: type });
        try {
            let result = '';
            if (type === 'summary') {
                result = await geminiService.summarizeText(data.inputText);
            } else if (type === 'keyPoints') {
                result = await geminiService.analyzeTextKeyPoints(data.inputText);
            } else {
                result = await geminiService.analyzeTextExplainSimply(data.inputText);
            }
            updateAndPersist({ analysisResult: result });
        } catch (error) {
            console.error(error);
            updateAndPersist({ analysisResult: "An error occurred during analysis." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const analysisTitles = {
        summary: "Summary",
        keyPoints: "Key Points",
        simple: "Simplified Explanation"
    };

    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
            <div className="p-2 border-b border-border-color flex-shrink-0 flex items-center justify-between gap-4 bg-surface">
                <h3 className="text-sm font-semibold px-2">Document Analyzer</h3>
                <div className="flex items-center gap-2">
                    <Button onClick={() => handleAnalyze('summary')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Summarize</Button>
                    <Button onClick={() => handleAnalyze('keyPoints')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Key Points</Button>
                    <Button onClick={() => handleAnalyze('simple')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Explain Simply</Button>
                </div>
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-px bg-border-color overflow-hidden">
                <textarea
                    value={data.inputText}
                    onChange={handleTextChange}
                    className="w-full h-full p-4 bg-background-dark focus:outline-none text-text-primary resize-none"
                    placeholder="Paste your text here to analyze..."
                    spellCheck="false"
                />
                <div className="w-full h-full p-4 bg-background-dark overflow-y-auto">
                    {isLoading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                    {!isLoading && data.analysisResult && (
                        <div>
                            <h4 className="font-bold text-lg mb-4">{data.analysisType && analysisTitles[data.analysisType]}</h4>
                            <div className="prose prose-invert max-w-none whitespace-pre-wrap">
                                {data.analysisResult}
                            </div>
                        </div>
                    )}
                    {!isLoading && !data.analysisResult && (
                        <div className="flex justify-center items-center h-full text-text-secondary">
                            <p>Analysis will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};