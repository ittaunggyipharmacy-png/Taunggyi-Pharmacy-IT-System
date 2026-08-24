import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { installAssetAssignmentUiEnhancer } from './features/assets/assignmentUiEnhancer';
import './index.css';

installAssetAssignmentUiEnhancer();

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <AccessControlProvider>
 <App />
 </AccessControlProvider>
 </StrictMode>,
);
