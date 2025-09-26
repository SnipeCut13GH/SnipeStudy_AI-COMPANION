import React, { useState } from 'react';
import { Project, DocsToolData } from '../../types.ts';
import * as geminiService from '../../services/geminiService.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';
// Fix: Import AppSettings to access language preference.
import { AppSettings } from '../../App.tsx';

interface DocumentAnalyzerViewProps {
    project: Project;
    onUpdateProject: (updater: (project: Project) => Project) => void;
    // Fix: Add settings prop to pass down language preference.
    settings: AppSettings;
}

const getInitialData = (project: Project): DocsToolData => {
    return project.tools.docs || {
        inputText: '',
        analysisResult: null,
        analysisType: null,
    };
};

export const DocsView: React.FC<DocumentAnalyzerViewProps> = ({ project, onUpdateProject, settings }) => {
    const [data, setData] = useState<DocsToolData>(getInitialData(project));
    const [isLoading, setIsLoading] = useState(false);
    
    const updateAndPersist = (newData: Partial<DocsToolData>) => {
        const updatedData = { ...data, ...newData };
        setData(updatedData as DocsToolData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, docs: updatedData as DocsToolData } }));
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
                // Fix: Pass the user's selected language to the text summarization service.
                result = await geminiService.summarizeText(data.inputText, settings.language);
            } else if (type === 'keyPoints') {
                result = await geminiService.analyzeTextKeyPoints(data.inputText, settings.language);
            } else {
                result = await geminiService.analyzeTextExplainSimply(data.inputText, settings.language);
            }
            updateAndPersist({ analysisResult: result });
        } catch (error: any) {
            console.error(error);
            updateAndPersist({ analysisResult: `Error: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!data.inputText && !data.analysisResult) return;
        const analysisTitle = data.analysisType ? data.analysisType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : "Analysis";
        let content = `<h1>Source Text</h1><p>${data.inputText.replace(/\n/g, '<br/>')}</p>`;
        if (data.analysisResult) {
            content += `<br/><hr/><br/><h1>${analysisTitle}</h1><p>${data.analysisResult.replace(/\n/g, '<br/>')}</p>`;
        }
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;
        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const link = document.createElement("a");
        link.href = source;
        link.download = `${project.name}_analysis.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const analysisTitles = {
        summary: "Summary",
        keyPoints: "Key Points",
        simple: "Simplified Explanation"
    };
    
    const isError = data.analysisResult?.startsWith('Error:');

    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
            <div className="p-2 border-b border-border-color flex-shrink-0 flex flex-wrap items-center justify-between gap-2 bg-surface">
                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={() => handleAnalyze('summary')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Summarize</Button>
                    <Button onClick={() => handleAnalyze('keyPoints')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Key Points</Button>
                    <Button onClick={() => handleAnalyze('simple')} size="sm" variant="secondary" disabled={isLoading || !data.inputText}>Explain Simply</Button>
                </div>
                <Button onClick={handleDownload} size="sm">Download DOC</Button>
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
                            {!isError && <h4 className="font-bold text-lg mb-4">{data.analysisType && analysisTitles[data.analysisType]}</h4>}
                            <div className={`prose prose-invert max-w-none whitespace-pre-wrap ${isError ? 'text-danger' : ''}`}>
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