import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText,
  Search,
  Library,
  ChevronLeft,
  X,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CatalogueImage {
  name: string;
  company: string;
  url: string;
}

const CATALOGUE_REPO_OWNER = 'ittaunggyipharmacy-png';
const CATALOGUE_REPO_NAME = 'taunggyipharmacy-catalogues';
const CATALOGUE_BRANCH = 'main';

const getCompanyColor = (company: string) => {
  const colors = [
    'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/20',
    'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
    'border-l-rose-500 bg-rose-50 dark:bg-rose-950/20',
    'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
    'border-l-sky-500 bg-sky-50 dark:bg-sky-950/20',
  ];
  let hash = 0;
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const CmdCataloguesModule = () => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<CatalogueImage | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<CatalogueImage[]>([]);

  // Keep environment variables as optional overrides, but always have a safe
  // default for the public catalogue repository. This prevents the live app
  // from showing an empty catalogue when Cloudflare does not inject the
  // optional GitHub variables.
  const owner = import.meta.env.VITE_GITHUB_REPO_OWNER || CATALOGUE_REPO_OWNER;
  const repo = import.meta.env.VITE_GITHUB_REPO_NAME || CATALOGUE_REPO_NAME;
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  useEffect(() => {
    const fetchCatalogues = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : { Accept: 'application/vnd.github+json' };

        const fetchContents = async (path = ''): Promise<CatalogueImage[]> => {
          const encodedPath = path
            .split('/')
            .filter(Boolean)
            .map(encodeURIComponent)
            .join('/');
          const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}${encodedPath ? '' : '?ref=' + CATALOGUE_BRANCH}`;
          const res = await fetch(url, { headers });
          if (!res.ok) {
            throw new Error(`Unable to load catalogue images from GitHub (${res.status}).`);
          }

          const items = await res.json();
          if (!Array.isArray(items)) return [];

          const results: CatalogueImage[] = [];
          for (const item of items) {
            if (item.type === 'dir') {
              results.push(...await fetchContents(item.path));
            } else if (item.type === 'file' && /\.(png|jpg|jpeg|webp|gif)$/i.test(item.name)) {
              // Use the raw GitHub URL instead of download_url so the image
              // remains stable on the live Worker and does not depend on API
              // response redirects.
              const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${CATALOGUE_BRANCH}/${item.path
                .split('/')
                .map(encodeURIComponent)
                .join('/')}`;

              results.push({
                name: item.name.replace(/\.[^/.]+$/, ''),
                company: item.path.split('/')[0] || 'Uncategorized',
                url: rawUrl,
              });
            }
          }
          return results;
        };

        const images = await fetchContents();
        setAllImages(images.sort((a, b) => a.name.localeCompare(b.name)));

        if (images.length === 0) {
          setError('No catalogue images found in the catalogue repository.');
        }
      } catch (err: any) {
        console.error('CMD Catalogues load error:', err);
        setError(err?.message || 'Unable to load CMD Catalogues.');
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

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.trim().toLowerCase();
    return companies.filter((company) =>
      company.toLowerCase().includes(q) ||
      groupedImages[company].some(img => img.name.toLowerCase().includes(q))
    );
  }, [search, companies, groupedImages]);

  return (
    <div className="p-6">
      <AnimatePresence mode="wait">
        {!selectedCompany ? (
          <motion.div
            key="shelf"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Library size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">CMD Catalogues</h1>
                  <p className="text-xs font-medium text-slate-500">Select a company to view products</p>
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies or products..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {loading && (
              <div className="py-16 text-center text-sm text-slate-500">Loading CMD Catalogues...</div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300">
                {error}
              </div>
            )}

            {!loading && !error && filteredCompanies.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-500">No catalogues match your search.</div>
            )}

            {!loading && filteredCompanies.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredCompanies.map(company => (
                  <motion.button
                    key={company}
                    whileHover={{ y: -5 }}
                    onClick={() => setSelectedCompany(company)}
                    className={`group relative flex flex-col p-4 h-48 border-l-4 rounded-r-lg shadow-sm hover:shadow-lg transition-all text-left ${getCompanyColor(company)}`}
                  >
                    <BookOpenText className="text-slate-400 mb-2 group-hover:text-indigo-600 transition" size={20} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">{company}</span>
                    <span className="mt-auto text-xs text-slate-500">{groupedImages[company].length} products</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="book"
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-6"
          >
            <button
              onClick={() => setSelectedCompany(null)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600"
            >
              <ChevronLeft size={16} /> Back to Shelf
            </button>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{selectedCompany}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {groupedImages[selectedCompany].map((img, i) => (
                <button
                  key={`${img.url}-${i}`}
                  onClick={() => setActiveImage(img)}
                  className="group border rounded-xl p-3 shadow-sm hover:shadow-md transition text-left"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    loading="lazy"
                    className="w-full h-40 object-contain mb-2 rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0.35';
                    }}
                  />
                  <p className="text-sm font-medium truncate">{img.name}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setActiveImage(null)}
        >
          <button
            onClick={() => setActiveImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X size={20} />
          </button>

          {selectedCompany && groupedImages[selectedCompany].length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const images = groupedImages[selectedCompany];
                  const currentIndex = images.findIndex(img => img.url === activeImage.url);
                  setActiveImage(images[(currentIndex - 1 + images.length) % images.length]);
                }}
                className="absolute left-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const images = groupedImages[selectedCompany];
                  const currentIndex = images.findIndex(img => img.url === activeImage.url);
                  setActiveImage(images[(currentIndex + 1) % images.length]);
                }}
                className="absolute right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <ChevronLeft size={24} className="rotate-180" />
              </button>
            </>
          )}

          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeImage.url}
              alt={activeImage.name}
              className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="flex items-center gap-4 text-white/90 text-sm">
              <span className="font-medium">{activeImage.name}</span>
              <a
                href={activeImage.url}
                download={activeImage.name}
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
