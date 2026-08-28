import React, { useState, useEffect } from 'react';
import { Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';

interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
}

// Public, direct-view thumbnail URL for a Drive file that is shared
// "Anyone with the link" -> Viewer. Works with no auth from the browser.
function getDriveThumbnailUrl(fileId: string, size = 1000): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

function getDriveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export const CmdCataloguesModule = () => {
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<DriveImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Set these in your hosting provider's Environment Variables
  // (must be prefixed with VITE_ so Vite exposes them to the browser build).
  const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1H6N6fSuJqVhs4iC_jR7ymS6Ctdql4SqQ';
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  useEffect(() => {
    if (!API_KEY) {
      setError('VITE_GOOGLE_API_KEY မသတ်မှတ်ရသေးပါ။ Cloudflare Workers ရဲ့ Environment Variables ထဲမှာ ထည့်ပြီး redeploy လုပ်ပါ။');
      setLoading(false);
      return;
    }

    const q = encodeURIComponent(`'${FOLDER_ID}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&key=${API_KEY}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Drive API error (${res.status}): ${body}`);
        }
        return res.json();
      })
      .then((data) => {
        const files: DriveImage[] = (data.files || []).filter((f: DriveImage) =>
          f.mimeType?.startsWith('image/')
        );
        setImages(files);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching catalogues:', err);
        setError(
          'Catalogue ပုံများကို ရယူ၍ မရပါ။ Folder ကို "Anyone with the link" အဖြစ် share ထားခြင်း ရှိမရှိ၊ API Key မှန်ကန်ခြင်း ရှိမရှိ စစ်ပါ. (' +
            (err?.message || '') +
            ')'
        );
        setLoading(false);
      });
  }, [FOLDER_ID, API_KEY]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CMD Catalogues</h1>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3 text-amber-600">
          <AlertTriangle size={32} />
          <p className="text-sm max-w-md">{error}</p>
        </div>
      )}

      {!loading && !error && images.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3 text-slate-400">
          <ImageIcon size={32} />
          <p className="text-sm">ဒီ Folder ထဲမှာ ပုံ (image) file မရှိသေးပါ။</p>
        </div>
      )}

      {!loading && !error && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {images.map((image) => (
            <div key={image.id} className="border rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <img
                src={getDriveThumbnailUrl(image.id)}
                alt={image.name}
                className="w-full h-48 object-contain mb-2"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <p className="text-sm font-medium truncate">{image.name}</p>
              <a
                href={getDriveViewUrl(image.id)}
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