import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, FileImage, FileVideo, Link as LinkIcon, Loader2, Megaphone, PlayCircle, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAnnouncement, subscribeToAnnouncements, ItAnnouncement, AnnouncementCategory } from '../../services/itAnnouncementService';
import { uploadStorageFile } from '../../services/storageService';
import { useAuth } from '../../features/auth/hooks/useAuth';

const categories: { value: AnnouncementCategory; label: string }[] = [
  { value: 'guide', label: 'Guide' }, { value: 'video', label: 'Video Guide' }, { value: 'link', label: 'Useful Link' },
  { value: 'notice', label: 'Important Notice' }, { value: 'tip', label: 'IT Tip' }, { value: 'document', label: 'Document / Manual' },
];
const isYouTube = (url?: string | null) => !!url && /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
const youtubeEmbedUrl = (url: string) => { const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/i); return match ? `https://www.youtube.com/embed/${match[1]}` : url; };
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export const ItAnnouncementModule = ({ isAdmin }: { isAdmin: boolean }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState(''); const [category, setCategory] = useState<AnnouncementCategory>('guide'); const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState(''); const [videoUrl, setVideoUrl] = useState(''); const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); const [videoFile, setVideoFile] = useState<File | null>(null);
  const [announcements, setAnnouncements] = useState<ItAnnouncement[]>([]); const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | AnnouncementCategory>('all'); const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { const unsubscribe = subscribeToAnnouncements(setAnnouncements); return () => unsubscribe(); }, []);
  const selected = useMemo(() => announcements.find(item => item.id === selectedId) || null, [announcements, selectedId]);
  const visibleAnnouncements = useMemo(() => filter === 'all' ? announcements : announcements.filter(item => item.category === filter), [announcements, filter]);
  const resetForm = () => { setTitle(''); setCategory('guide'); setContent(''); setLinkUrl(''); setVideoUrl(''); setCoverImageUrl(''); setImageFile(null); setVideoFile(null); };
  const handleImageChange = (file: File | null) => { if (!file) return setImageFile(null); if (!file.type.startsWith('image/')) return toast.error('ပုံဖိုင်ကိုသာ ရွေးပါ။'); if (file.size > MAX_IMAGE_SIZE) return toast.error('ပုံအရွယ်အစား 10 MB ထက်မကျော်ရပါ။'); setImageFile(file); };
  const handleVideoChange = (file: File | null) => { if (!file) return setVideoFile(null); if (!file.type.startsWith('video/')) return toast.error('Video ဖိုင်ကိုသာ ရွေးပါ။'); if (file.size > MAX_VIDEO_SIZE) return toast.error('Video အရွယ်အစား 50 MB ထက်မကျော်ရပါ။'); setVideoFile(file); };
  const handlePost = async () => {
    if (!currentUser || !isAdmin) return toast.error('Admin account ဖြင့်ဝင်ထားရန်လိုပါသည်။');
    if (!title.trim()) return toast.error('Title ထည့်ပါ။'); if (!content.trim()) return toast.error('Guide အကြောင်းအရာ ထည့်ပါ။');
    if (!imageFile && !videoFile && !coverImageUrl.trim() && !videoUrl.trim() && !linkUrl.trim()) return toast.error('ပုံ၊ Video၊ Link တစ်ခုခု ထည့်ပေးပါ။');
    setLoading(true);
    try {
      let uploadedImageUrl = coverImageUrl.trim() || null; let uploadedVideoUrl = videoUrl.trim() || null;
      if (imageFile) { const result = await uploadStorageFile(imageFile, `it-guides/images/${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`); if (!result?.path) throw new Error('Image upload failed'); uploadedImageUrl = supabasePublicUrl(result.path); }
      if (videoFile) { const result = await uploadStorageFile(videoFile, `it-guides/videos/${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`); if (!result?.path) throw new Error('Video upload failed'); uploadedVideoUrl = supabasePublicUrl(result.path); }
      await postAnnouncement({ userId: currentUser.id, userName: currentUser.email || 'IT Admin', title: title.trim(), category, content: content.trim(), coverImageUrl: uploadedImageUrl, videoUrl: uploadedVideoUrl, linkUrl: linkUrl.trim() || null });
      resetForm(); toast.success('IT Guide ကို Publish လုပ်ပြီးပါပြီ။');
    } catch (error) { console.error('Failed to publish IT guide:', error); toast.error('မတင်နိုင်ပါ။ Supabase Storage permission / file size / URL ကို စစ်ပါ။'); } finally { setLoading(false); }
  };

  if (selected) return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 mb-6"><ArrowLeft size={17} /> Back to IT Guides</button>
      <article className="bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm">
        {selected.coverImageUrl && <img src={selected.coverImageUrl} alt={selected.title} className="w-full max-h-[460px] object-cover" />}
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3"><Megaphone size={15} /> {categories.find(c => c.value === selected.category)?.label || selected.category} · {new Date(selected.createdAt).toLocaleString()}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{selected.title}</h1>
          <div className="mt-6 whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-300">{selected.content}</div>
          {selected.videoUrl && (isYouTube(selected.videoUrl) ? <div className="mt-7 aspect-video"><iframe src={youtubeEmbedUrl(selected.videoUrl)} title={selected.title} className="w-full h-full rounded-xl" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <video src={selected.videoUrl} controls preload="metadata" className="mt-7 w-full rounded-xl max-h-[600px]" />)}
          {selected.linkUrl && <a href={selected.linkUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"><ExternalLink size={16} /> Open Useful Link</a>}
        </div>
      </article>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8"><h1 className="text-2xl md:text-3xl font-bold">IT Guide & Announcements</h1><p className="text-slate-500 mt-1">User တွေအတွက် IT Guide, Video, Link, Document နဲ့ အသိပေးချက်တွေကို လွယ်လွယ်ကူကူ ရှာဖတ်နိုင်ပါသည်။</p></div>
      {isAdmin && <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-lg">Create IT Guide</h2>
        <div className="grid md:grid-cols-2 gap-4"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="p-3 rounded-lg border bg-transparent" /><select value={category} onChange={e => setCategory(e.target.value as AnnouncementCategory)} className="p-3 rounded-lg border bg-transparent">{categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Guide အကြောင်းအရာ / Description..." rows={5} className="w-full p-3 rounded-lg border bg-transparent" />
        <div className="grid md:grid-cols-2 gap-4"><label className="border rounded-lg p-4 cursor-pointer block hover:border-indigo-400"><span className="flex items-center gap-2 font-medium"><FileImage size={18} /> Cover Image</span><span className="block text-xs text-slate-500 mt-1">Image • Max 10 MB</span><input type="file" accept="image/*" className="mt-3 w-full" onChange={e => handleImageChange(e.target.files?.[0] || null)} />{imageFile && <span className="block text-sm text-green-600 mt-2 truncate">✓ {imageFile.name}</span>}</label><label className="border rounded-lg p-4 cursor-pointer block hover:border-indigo-400"><span className="flex items-center gap-2 font-medium"><FileVideo size={18} /> Video File</span><span className="block text-xs text-slate-500 mt-1">Video • Max 50 MB</span><input type="file" accept="video/*" className="mt-3 w-full" onChange={e => handleVideoChange(e.target.files?.[0] || null)} />{videoFile && <span className="block text-sm text-green-600 mt-2 truncate">✓ {videoFile.name}</span>}</label></div>
        {(imageFile || videoFile) && <div className="flex flex-wrap gap-2">{imageFile && <button type="button" onClick={() => setImageFile(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800">Image <X size={12} /></button>}{videoFile && <button type="button" onClick={() => setVideoFile(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800">Video <X size={12} /></button>}</div>}
        <div className="grid md:grid-cols-2 gap-4"><input value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="Image URL (optional)" className="p-3 rounded-lg border bg-transparent" /><input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube / Video URL (optional)" className="p-3 rounded-lg border bg-transparent" /></div>
        <div className="flex gap-2"><LinkIcon className="mt-3 text-slate-400" size={18} /><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Useful Link (optional)" className="flex-1 p-3 rounded-lg border bg-transparent" /></div>
        <button onClick={handlePost} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {loading ? 'Uploading & Publishing...' : 'Publish'}</button>
      </div>}

      <div className="flex flex-wrap gap-2 mb-6">{[{value:'all',label:'All'}, ...categories].map(item => <button key={item.value} onClick={() => setFilter(item.value as 'all' | AnnouncementCategory)} className={`px-4 py-2 rounded-full text-sm border transition ${filter === item.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 hover:border-indigo-400'}`}>{item.label}</button>)}</div>
      {visibleAnnouncements.length > 0 ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{visibleAnnouncements.map(item => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="text-left bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition group"><div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><PlayCircle size={42} /></div>}</div><div className="p-5"><div className="text-xs font-medium text-indigo-600 mb-2">{categories.find(c => c.value === item.category)?.label || item.category}</div><h2 className="font-semibold text-lg line-clamp-2">{item.title}</h2><p className="mt-2 text-sm text-slate-500 line-clamp-2">{item.content}</p><div className="mt-4 text-sm font-medium text-indigo-600">Read Guide →</div></div></button>)}</div> : <div className="text-center py-16 text-slate-500"><PlayCircle className="mx-auto mb-2" /> No IT guides yet.</div>}
    </div>
  );
};

const supabasePublicUrl = (path: string) => { const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined; if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL'); return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/uploads/${path}`; };
