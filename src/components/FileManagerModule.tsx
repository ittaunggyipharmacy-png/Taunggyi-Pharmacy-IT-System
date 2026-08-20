import React, { useState, useEffect } from 'react';
import { HardDrive, Folder, File, Upload, Trash2, Download, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
import { fetchStorageFiles, fetchStorageQuota, deleteStorageFile } from '../services/firestoreService';
import { formatStorage } from '../lib/utils';
import { auth } from '../services/firebase';

interface FileManagerModuleProps {
  isAdmin: boolean;
}

export function FileManagerModule({ isAdmin }: FileManagerModuleProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [quota, setQuota] = useState<{ usage: string; limit: string } | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: '', name: 'Root' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolder = folderHistory[folderHistory.length - 1];

  const loadData = async (folderId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [filesRes, quotaRes] = await Promise.allSettled([
        fetchStorageFiles(folderId),
        fetchStorageQuota()
      ]);

      if (filesRes.status === 'fulfilled') {
        setFiles(filesRes.value.files || []);
      } else {
        setError((filesRes.reason as Error).message || 'Failed to load drive files');
      }

      if (quotaRes.status === 'fulfilled') {
        setQuota(quotaRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Drive service error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentFolder.id || undefined);
  }, [currentFolder.id]);

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    setFolderHistory(prev => prev.slice(0, index + 1));
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("Are you sure you want to remove this file from Drive?")) return;
    try {
      await deleteStorageFile(fileId);
      loadData(currentFolder.id || undefined);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cloud Storage & Drive</h1>
          <p className="text-xs text-slate-500 mt-1">Google Workspace Shared Drive document explorer</p>
        </div>
        <button
          onClick={() => loadData(currentFolder.id || undefined)}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {quota && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HardDrive size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Google Drive Storage</p>
              <p className="text-2xs text-slate-400">{formatStorage(quota.usage)} of {formatStorage(quota.limit)} used</p>
            </div>
          </div>
          <div className="w-48 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden hidden sm:block">
            <div
              className="bg-indigo-600 h-full rounded-full"
              style={{
                width: `${Math.min(100, (Number(quota.usage) / (Number(quota.limit) || 1)) * 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white dark:bg-slate-900 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
        {folderHistory.map((crumb, idx) => (
          <React.Fragment key={crumb.id || 'root'}>
            {idx > 0 && <ChevronRight size={12} className="text-slate-400" />}
            <button
              onClick={() => handleNavigateToBreadcrumb(idx)}
              className={`hover:text-indigo-600 ${idx === folderHistory.length - 1 ? 'font-bold text-slate-900 dark:text-white' : ''}`}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Storage Service Notice</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* File List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3.5">Name</th>
              <th className="p-3.5">Size</th>
              <th className="p-3.5">Last Modified</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400">
                  {isLoading ? 'Loading files from Drive...' : 'No files or folders found in this directory.'}
                </td>
              </tr>
            ) : (
              files.map((file) => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                return (
                  <tr key={file.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5">
                      {isFolder ? (
                        <button
                          onClick={() => handleOpenFolder(file.id, file.name)}
                          className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 text-left"
                        >
                          <Folder size={16} className="text-amber-500 shrink-0" />
                          <span>{file.name}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <File size={16} className="text-indigo-500 shrink-0" />
                          <span>{file.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {isFolder ? '--' : formatStorage(file.size)}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '--'}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FileManagerModule;
