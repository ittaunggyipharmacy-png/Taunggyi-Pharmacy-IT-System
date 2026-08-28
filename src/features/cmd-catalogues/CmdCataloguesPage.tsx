import React, { useState, useEffect } from 'react';
import { Loader2, Folder, Image as ImageIcon } from 'lucide-react';

interface DriveFolder {
  id: string;
  name: string;
}

interface DriveImage {
  id: string;
  name: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

export const CmdCataloguesPage = () => {
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [images, setImages] = useState<DriveImage[]>([]);

  useEffect(() => {
    // This would need to interact with Google Drive API via OAuth token
    // For now, this is a placeholder structure.
    setLoading(false);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CMD Catalogues</h1>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Companies</h2>
            {folders.map(folder => (
              <button
                key={folder.id}
                className={`w-full text-left p-2 rounded ${selectedFolder === folder.id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <Folder className="inline mr-2 text-yellow-500" size={18} />
                {folder.name}
              </button>
            ))}
          </div>
          <div className="col-span-2 border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Catalogues</h2>
            {/* Display images here */}
          </div>
        </div>
      )}
    </div>
  );
};
