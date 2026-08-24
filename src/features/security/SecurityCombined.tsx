import React from 'react';
import { SecurityModule } from './SecurityPage';
import { InfrastructurePage } from './InfrastructurePage';
import { BackupLog, CCTVRequest } from '../../types';

export function SecurityCombined(props: {
  backups: BackupLog[];
  setBackups: (b: BackupLog[]) => void;
  requests: CCTVRequest[];
  setRequests: (r: CCTVRequest[]) => void;
  searchTerm: string;
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-10">
      <SecurityModule {...props} />
      <div className="border-t border-slate-200 dark:border-slate-800 pt-8">
        <InfrastructurePage isAdmin={props.isAdmin} />
      </div>
    </div>
  );
}
