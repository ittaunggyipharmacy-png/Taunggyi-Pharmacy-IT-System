import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Search } from 'lucide-react';

// Every image you upload into src/assets/catalogues/ (jpg, jpeg, png, webp, gif)
// is automatically picked up here at build time. No API, no backend, no keys.
// To add a new catalogue image: upload the file into that folder on GitHub,
// commit, and Cloudflare will rebuild the site automatically.
const modules = import.meta.glob('/src/assets/catalogues/*.{png,jpg,jpeg,webp,gif,PNG,JPG,JPEG}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

interface CatalogueImage {
  name: string;
  url: string;
}

const allImages: CatalogueImage[] = Object.entries(modules)
  .map(([path, url]) => ({
    name: decodeURIComponent(path.split('/').pop() || path),
    url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const PAGE_SIZE = 24;

export const CmdCataloguesModule = () => {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!search.trim()) return allImages;
    const q = search.trim().toLowerCase();
    return allImages.filter((img) => img.name.toLowerCase().includes(q));
  }, [search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">CMD Catalogues</h1>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search catalogues..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        {filtered.length} of {allImages.length} catalogue{allImages.length === 1 ? '' : 's'}
      </p>

      {allImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3 text-slate-400">
          <ImageIcon size={32} />
          <p className="text-sm max-w-md">
            ပုံ file မတွေ့သေးပါ။ src/assets/catalogues/ folder ထဲကို ပုံများ upload
            လုပ်ပြီး commit လုပ်ပါ။
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center gap-3 text-slate-400">
          <Search size={32} />
          <p className="text-sm">ရှာဖွေမှုနှင့် ကိုက်ညီသော catalogue မတွေ့ပါ။</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {visible.map((image) => (
              <div
                key={image.name}
                className="border rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-40 object-contain mb-2"
                  loading="lazy"
                />
                <p className="text-sm font-medium truncate">{image.name}</p>
                <a
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 mt-2 block"
                >
                  View Full Size
                </a>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                Load More ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};