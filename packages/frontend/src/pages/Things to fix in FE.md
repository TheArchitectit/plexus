Things to fix in FE

:MainDash:
Recent activity seems to be placeholder
30s refresh redraws whole graph with animantion.  Is distracting. 


Usage Page: Seems to be just placeholder data?


LogsPage:
    
    
    DEbugTraces:List is shown, but clicking the list item changes right panel title, but no actual trace is shown
    
    KeysPage
Edit icon should change - currently is ‘plus’Providers PageModal:Custom Headers (JSON) and ExtraBody fields should render \n, right now it’s just raw.Models should not be comma separated field - make it small text fields with add/remove buttonsAdvanced chevron should be Left when collapsed, not down.


Error Logs:List is shown, but clicking an error shows on consoleapi.ts:71  GET http://localhost:4000/v0/logs/6060030b-70a7-4253-ba97-debc5bd60848 404 (Not Found)
Errors.tsx:52 Failed to fetch error details: Error: Log not found
    at Object.getLogDetails (api.ts:76:22)
    at async fetchErrorDetails (Errors.tsx:46:24)Also same Monaco errorConfigPage:monaco-editor.tsx:28 Could not create web worker(s). Falling back to loading web worker code in main thread, which might cause UI freezes. Please see https://github.com/microsoft/monaco-editor#faq
monaco-editor.tsx:28 You must define a function MonacoEnvironment.getWorkerUrl or MonacoEnvironment.getWorker


Models Page:
Edit icon

Main table - selector strategy friendly name mapping (in_order to In Order)make alias name and each addl alias and the target are copy-able with hover.ModalAPI Match boolean, but api-match is not used anywhere else in the code.  Remove it for now.If selector != random, don’t show the weight options - just hide them.Make the target cards more compact - everything on same row

Future:

Keys: 
Descriptions + : splitting