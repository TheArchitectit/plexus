'use client';

import React, { forwardRef } from 'react';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  options?: any;
  height?: string;
  className?: string;
}

const MonacoEditor = forwardRef<any, MonacoEditorProps>(
  ({ value, onChange, language = 'yaml', theme = 'vs-dark', options, height = '500px', className }, ref) => {
    return (
      <div className={cn('border border-border rounded-md overflow-hidden', className)} style={{ height }}>
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          theme={theme}
          value={value}
          onChange={onChange}
          options={{
            readOnly: options?.readOnly ?? false,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            rulers: [80],
            folding: true,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            ...options,
          }}
          loading="Loading editor..."
        />
      </div>
    );
  }
);

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
