import React, { useState } from 'react';
import { Project, CodeModeToolData } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Spinner } from '../common/Spinner.tsx';
import * as geminiService from '../../services/geminiService.ts';

interface CodeModeViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
}

const getInitialData = (project: Project): CodeModeToolData => {
  return project.tools.code_mode || {
    prompt: 'a simple counter with + and - buttons',
    generatedHtml: null,
  };
};

export const CodeModeView: React.FC<CodeModeViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<CodeModeToolData>(getInitialData(project));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const updateAndPersist = (newData: Partial<CodeModeToolData>) => {
        const updatedData = { ...data, ...newData };
        setData(updatedData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, code_mode: updatedData } }));
    };

    const handleBuildApp = async () => {
        if (!data.prompt.trim() || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const html = await geminiService.generateHtmlApp(data.prompt);
            updateAndPersist({ generatedHtml: html });
        } catch (error: any) {
            console.error("Failed to build app", error);
            setError(error.message);
            const errorHtml = `<html><body style="font-family: sans-serif; color: #ffcdd2; background-color: #1a1a1a; padding: 2rem;"><h2>Error Building App</h2><p>The AI failed to generate the application. Please try again with a more specific prompt.</p><p><strong>Details:</strong> ${error.message}</p></body></html>`;
            updateAndPersist({ generatedHtml: errorHtml });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col bg-background-darkest">
             <div className="p-2 border-b border-border-color flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 bg-surface">
                <input
                    type="text"
                    value={data.prompt}
                    onChange={e => setData({ ...data, prompt: e.target.value })}
                    placeholder="Describe the web app you want to build..."
                    className="w-full sm:flex-1 bg-background-light border border-border-color p-2 rounded-md text-text-primary"
                    disabled={isLoading}
                />
                <Button onClick={handleBuildApp} disabled={isLoading || !data.prompt.trim()} className="w-full sm:w-auto">
                    {isLoading ? <Spinner /> : 'Build App'}
                </Button>
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-px bg-border-color overflow-hidden">
                <div className="bg-background-dark flex flex-col">
                    <h3 className="text-sm font-semibold p-2 bg-surface">Live Preview</h3>
                    <iframe
                        srcDoc={data.generatedHtml || ''}
                        title="Live Preview"
                        sandbox="allow-scripts"
                        className="w-full h-full border-0"
                    />
                </div>
                <div className="bg-background-dark flex flex-col">
                    <h3 className="text-sm font-semibold p-2 bg-surface">Generated Code</h3>
                    <textarea
                        value={data.generatedHtml || '// Generated code will appear here...'}
                        readOnly
                        className="w-full h-full p-4 bg-background-dark focus:outline-none text-text-primary font-mono resize-none"
                        spellCheck="false"
                    />
                </div>
            </div>
        </div>
    );
};