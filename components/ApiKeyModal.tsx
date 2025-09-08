import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (apiKey: string) => Promise<boolean>;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key cannot be empty.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const success = await onSave(apiKey.trim());
    if (!success) {
      setError('The provided API key appears to be invalid.');
    }
    setIsSaving(false);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background-darkest flex items-center justify-center">
        <div className="bg-background-dark p-8 rounded-lg shadow-2xl w-full max-w-md border border-border-color">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome to SnipeStudy</h2>
            <p className="text-text-secondary mb-6">Please enter your Google Gemini API key to continue. Your key will be stored in your browser's local storage.</p>
            <div className="space-y-4">
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-background-light border border-border-color rounded-lg p-3 text-white focus:ring-brand-primary focus:border-brand-primary"
                    disabled={isSaving}
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !apiKey.trim()}
                    className="w-full bg-brand-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 disabled:bg-gray-600 transition-colors"
                >
                    {isSaving ? 'Verifying...' : 'Save and Continue'}
                </button>
            </div>
            <p className="text-xs text-text-secondary mt-6 text-center">You can generate an API key from the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-brand-secondary hover:underline">Google AI Studio</a>.</p>
        </div>
    </div>
  );
};
