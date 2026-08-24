import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { installAssetAssignmentUiEnhancer } from './features/assets/assignmentUiEnhancer';
import { installAssetsByUserDepartmentFilter } from './features/assets/assetsByUserDepartmentEnhancer';
import './index.css';

installAssetAssignmentUiEnhancer();
installAssetsByUserDepartmentFilter();

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <AccessControlProvider>
 <App />
 </AccessControlProvider>
 </StrictMode>,
);
