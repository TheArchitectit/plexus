import React, { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Save, RotateCcw } from 'lucide-react';

export const Config = () => {
  const [config, setConfig] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.getConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await api.saveConfig(config);
    setTimeout(() => setIsSaving(false), 500); // Simulate delay
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Configuration</h1>
        <p className="page-description">Edit global system configuration.</p>
      </div>

      <div className="card">
        <div className="card-header">
            <h3 className="card-title">plexus.yaml</h3>
            <div style={{display: 'flex', gap: '8px'}}>
                 <Button variant="secondary" size="sm" onClick={() => api.getConfig().then(setConfig)} leftIcon={<RotateCcw size={14}/>}>Reset</Button>
                 <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} leftIcon={<Save size={14}/>}>Save Changes</Button>
            </div>
        </div>
        <div className="code-editor-container">
            <CodeMirror
              value={config}
              height="500px"
              extensions={[yaml()]}
              onChange={(value) => setConfig(value)}
              theme="dark"
              basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  history: true,
                  foldGutter: true,
                  drawSelection: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  defaultKeymap: true,
                  searchKeymap: true,
                  historyKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
              }}
            />
        </div>
      </div>
    </div>
  );
};
