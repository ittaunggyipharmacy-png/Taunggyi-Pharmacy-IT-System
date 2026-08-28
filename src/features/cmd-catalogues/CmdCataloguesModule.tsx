import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  BookOpenText,
  Image as ImageIcon,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface CatalogueImage {
  name: string;
  company: string;
  url: string;
}

const PAGE_SIZE = 24;

export const CmdCataloguesModule = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<CatalogueImage[]>([]);
  const [activeIndex, setActiveIndex] = useState<{ company: string; index: number } | null>(null);

  const owner = import.meta.env.VITE_GITHUB_REPO_OWNER;
  const repo = import.meta.env.VITE_GITHUB_REPO_NAME;
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  useEffect(() => {
    if (!owner || !repo) {
      setError('GitHub configuration missing (VITE_GITHUB_REPO_OWNER / VITE_GITHUB_REPO_NAME).');
      setLoading(false);
      return;
    }

    const fetchCatalogues = async () => {
      try {
        setLoading(true);
        // Recursive fetch to get all images
        const fetchContents = async (path: string): Promise<CatalogueImage[]> => {
          const headers: HeadersInit = token ? { 'Authorization': `token ${token}` } : {};
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
          if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
          const items = await res.json();
          
          let results: CatalogueImage[] = [];
          for (const item of items) {
            if (item.type === 'dir') {
              results = [...results, ...await fetchContents(item.path)];
            } else if (item.type === 'file' && /\.(png|jpg|jpeg|webp|gif)$/i.test(item.name)) {
              results.push({
                name: item.name.replace(/\.[^/.]+$/, ''),
                company: item.path.split('/')[0] || 'Uncategorized',
                url: item.download_url
              });
            }
          }
          return results;
        };

        const images = await fetchContents('');
        setAllImages(images.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogues();
  }, [owner, repo, token]);

  const groupedImages = useMemo(() => {
    return allImages.reduce((acc, img) => {
      if (!acc[img.company]) acc[img.company] = [];
      acc[img.company].push(img);
      return acc;
    }, {} as Record<string, CatalogueImage[]>);
  }, [allImages]);

  const companies = useMemo(() => Object.keys(groupedImages).sort(), [groupedImages]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedImages;
    const q = search.trim().toLowerCase();
    const result: Record<string, CatalogueImage[]> = {};
    Object.entries(groupedImages).forEach(([company, images]) => {
      const filtered = images.filter((img) => img.name.toLowerCase().includes(q) || company.toLowerCase().includes(q));
      if (filtered.length > 0) result[company] = filtered;
    });
    return result;
  }, [search, groupedImages]);

  // Flatten for lightbox navigation
  const flattenedVisible = useMemo(() => {
    const list: (CatalogueImage & { index: number; company: string })[] = [];
    Object.entries(filteredGroups).forEach(([company, images]) => {
      images.forEach((img, i) => list.push({ ...img, index: i, company }));
    });
    return list;
  }, [filteredGroups]);
  
  const hasMore = visibleCount < flattenedVisible.length;
  const visibleList = flattenedVisible.slice(0, visibleCount);

  const openViewer = (company: string, indexInCompany: number) => {
    const flatIndex = flattenedVisible.findIndex(item => item.company === company && item.index === indexInCompany);
    setActiveIndex({ company, index: indexInCompany });
  };
  
  const closeViewer = useCallback(() => setActiveIndex(null), []);

  const goPrev = useCallback(() => {
    if (!activeIndex) return;
    const flatIndex = flattenedVisible.findIndex(item => item.company === activeIndex.company && item.index === activeIndex.index);
    if (flatIndex > 0) {
      const prev = flattenedVisible[flatIndex - 1];
      setActiveIndex({ company: prev.company, index: prev.index });
    }
  }, [activeIndex, flattenedVisible]);

  const goNext = useCallback(() => {
    if (!activeIndex) return;
    const flatIndex = flattenedVisible.findIndex(item => item.company === activeIndex.company && item.index === activeIndex.index);
    if (flatIndex < flattenedVisible.length - 1) {
      const next = flattenedVisible[flatIndex + 1];
      setActiveIndex({ company: next.company, index: next.index });
    }
  }, [activeIndex, flattenedVisible]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, closeViewer, goPrev, goNext]);

  const activeImage = activeIndex ? groupedImages[activeIndex.company][activeIndex.index] : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpenText size={22} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Inventory Management
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              CMD Catalogues
            </h1>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalogues..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
        {allImages.length} catalogue{allImages.length === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : error ? (
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Error loading catalogues"
          message={error}
        />
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<ImageIcon size={28} />}
          title="No catalogues yet"
          message="Upload image files into your GitHub repository to see them here."
        />
      ) : Object.keys(filteredGroups).length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="No matches"
          message={`Nothing found for "${search}". Try a different search term.`}
        />
      ) : (
        <>
          {companies.map(company => filteredGroups[company] && (
            <div key={company} className="mb-10">
              <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">{company}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredGroups[company].map((image, i) => (
                  <button
                    key={image.name + i}
                    onClick={() => openViewer(company, i)}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-left"
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Maximize2 size={14} className="text-slate-700 dark:text-slate-200" />
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 p-3 text-xs font-medium text-white translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 truncate">
                      {image.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Lightbox */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={closeViewer}
        >
          <button
            onClick={closeViewer}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {flattenedVisible.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                aria-label="Previous"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                aria-label="Next"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={activeImage.url}
              alt={activeImage.name}
              className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="flex items-center gap-4 text-white/90 text-sm">
              <span className="font-medium">{activeImage.name}</span>
              <span className="text-white/40">
                {flattenedVisible.findIndex(item => item.company === activeIndex!.company && item.index === activeIndex!.index) + 1} / {flattenedVisible.length}
              </span>
              <a
                href={activeImage.url}
                download={activeImage.name}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) => (
  <div className="flex flex-col items-center justify-center h-72 text-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{message}</p>
    </div>
  </div>
);