import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AccessControlProvider } from './contexts/AccessControlContext';
import { installAssetsByUserDepartmentFilter } from './features/assets/assetsByUserDepartmentEnhancer';
import './index.css';

installAssetsByUserDepartmentFilter();

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <AccessControlProvider>
 <App />
 </AccessControlProvider>
 </StrictMode>,
);
