import React, { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { getGoogleDriveImageUrl } from '../../utils/drive';

interface DriveImage {
  id: string;
  name: string;
  webContentLink?: string;
  webViewLink?: string;
}

export const CmdCataloguesModule = () => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<DriveImage[]>([]);
  const FOLDER_ID = '1H6N6fSuJqVhs4iC_jR7ymS6Ctdql4SqQ';

  useEffect(() => {
    fetch(`/api/drive/files?folderId=${FOLDER_ID}`)
      .then(res => res.json())
      .then(data => {
        setImages(data.filter((file: any) => file.mimeType.startsWith('image/')));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching catalogues:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CMD Catalogues</h1>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {images.map(image => (
            <div key={image.id} className="border rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <img 
                src={getGoogleDriveImageUrl(image.webContentLink || '')} 
                alt={image.name} 
                className="w-full h-48 object-contain mb-2"
                referrerPolicy="no-referrer"
              />
              <p className="text-sm font-medium truncate">{image.name}</p>
              <a 
                href={image.webViewLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-600 mt-2 block"
              >
                View Original
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
