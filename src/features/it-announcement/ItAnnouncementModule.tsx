import React, { useEffect, useState } from 'react';
import { ExternalLink, FileImage, FileVideo, Link as LinkIcon, Loader2, Megaphone, PlayCircle, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAnnouncement, subscribeToAnnouncements, ItAnnouncement, AnnouncementCategory } from '../../services/itAnnouncementService';
import { uploadStorageFile } from '../../services/storageService';
import { useAuth } from '../../features/auth/hooks/useAuth';

const categories: { value: AnnouncementCategory; label: string }[] = [
  { value: 'guide', label: 'Guide' },
  { value: 'video', label: 'Video Guide' },
  { value: 'link', label: 'Useful Link' },
  { value: 'notice', label: 'Important Notice' },
  { value: 'tip', label: 'IT Tip' },
  { value: 'document', label: 'Document / Manual' },
];

const isYouTube = (url?: string | null) => !!url && /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
const youtubeEmbedUrl = (url: string) => {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export const ItAnnouncementModule = ({ isAdmin }: { isAdmin: boolean }) => {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('guide');
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [announcements, setAnnouncements] = useState<ItAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements(setAnnouncements);
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle('');
    setCategory('guide');
    setContent('');
    setLinkUrl('');
    setVideoUrl('');
    setCoverImageUrl('');
    setImageFile(null);
    setVideoFile(null);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return setImageFile(null);
    if (!file.type.startsWith('image/')) return toast.error('ပုံဖိုင်ကိုသာ ရွေးပါ။');
    if (file.size > MAX_IMAGE_SIZE) return toast.error('ပုံအရွယ်အစား 10 MB ထက်မကျော်ရပါ။');
    setImageFile(file);
  };

  const handleVideoChange = (file: File | null) => {
    if (!file) return setVideoFile(null);
    if (!file.type.startsWith('video/')) return toast.error('Video ဖိုင်ကိုသာ ရွေးပါ။');
    if (file.size > MAX_VIDEO_SIZE) return toast.error('Video အရွယ်အစား 50 MB ထက်မကျော်ရပါ။');
    setVideoFile(file);
  };

  const handlePost = async () => {
    if (!currentUser || !isAdmin) return toast.error('Admin account ဖြင့်ဝင်ထားရန်လိုပါသည်။');
    if (!title.trim()) return toast.error('Title ထည့်ပါ။');
    if (!content.trim()) return toast.error('Guide အကြောင်းအရာ ထည့်ပါ။');
    if (!imageFile && !videoFile && !coverImageUrl.trim() && !videoUrl.trim() && !linkUrl.trim()) {
      return toast.error('ပုံ၊ Video၊ Link တစ်ခုခု ထည့်ပေးပါ။');
    }

    setLoading(true);
    try {
      let uploadedImageUrl = coverImageUrl.trim() || null;
      let uploadedVideoUrl = videoUrl.trim() || null;

      if (imageFile) {
        const result = await uploadStorageFile(imageFile, `it-guides/images/${Date.now()}`);
        if (!result?.path) throw new Error('Image upload failed');
        uploadedImageUrl = supabasePublicUrl(result.path);
      }

      if (videoFile) {
        const result = await uploadStorageFile(videoFile, `it-guides/videos/${Date.now()}`);
        if (!result?.path) throw new Error('Video upload failed');
        uploadedVideoUrl = supabasePublicUrl(result.path);
      }

      await postAnnouncement({
        userId: currentUser.id,
        userName: currentUser.email || 'IT Admin',
        title: title.trim(),
        category,
        content: content.trim(),
        coverImageUrl: uploadedImageUrl,
        videoUrl: uploadedVideoUrl,
        linkUrl: linkUrl.trim() || null,
      });

      resetForm();
      toast.success('IT Guide ကို Publish လုပ်ပြီးပါပြီ။');
    } catch (error) {
      console.error('Failed to publish IT guide:', error);
      toast.error('မတင်နိုင်ပါ။ Supabase Storage permission / file size / URL ကို စစ်ပါ။');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">IT Guide & Announcements</h1>
        <p className="text-slate-500 mt-1">User တွေအတွက် IT Guide, Video, Link, Document နဲ့ အသိပေးချက်တွေကို တစ်နေရာတည်းမှာ မျှဝေပါ။</p>
      </div>

      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-6 mb-8 space-y-4">
          <h2 className="font-semibold text-lg">Create IT Guide</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="p-3 rounded-lg border bg-transparent" />
            <select value={category} onChange={e => setCategory(e.target.value as AnnouncementCategory)} className="p-3 rounded-lg border bg-transparent">
              {categories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Guide အကြောင်းအရာ / Description..." rows={5} className="w-full p-3 rounded-lg border bg-transparent" />

          <div className="grid md:grid-cols-2 gap-4">
            <label className="border rounded-lg p-4 cursor-pointer block hover:border-indigo-400 transition-colors">
              <span className="flex items-center gap-2 font-medium"><FileImage size={18} /> Cover Image</span>
              <span className="block text-xs text-slate-500 mt-1">Image file • Max 10 MB</span>
              <input type="file" accept="image/*" className="mt-3 w-full" onChange={e => handleImageChange(e.target.files?.[0] || null)} />
              {imageFile && <span className="block text-sm text-green-600 mt-2 truncate">✓ {imageFile.name}</span>}
            </label>

            <label className="border rounded-lg p-4 cursor-pointer block hover:border-indigo-400 transition-colors">
              <span className="flex items-center gap-2 font-medium"><FileVideo size={18} /> Video File</span>
              <span className="block text-xs text-slate-500 mt-1">Video file • Max 50 MB</span>
              <input type="file" accept="video/*" className="mt-3 w-full" onChange={e => handleVideoChange(e.target.files?.[0] || null)} />
              {videoFile && <span className="block text-sm text-green-600 mt-2 truncate">✓ {videoFile.name}</span>}
            </label>
          </div>

          {(imageFile || videoFile) && (
            <div className="flex flex-wrap gap-2">
              {imageFile && <button type="button" onClick={() => setImageFile(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800">Image <X size={12} /></button>}
              {videoFile && <button type="button" onClick={() => setVideoFile(null)} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-800">Video <X size={12} /></button>}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <input value={coverImageUrl} onChange={e => setCoverImageUrl(e.target.value)} placeholder="Image URL (optional)" className="p-3 rounded-lg border bg-transparent" />
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube / Video URL (optional)" className="p-3 rounded-lg border bg-transparent" />
          </div>

          <div className="flex gap-2">
            <LinkIcon className="mt-3 text-slate-400" size={18} />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="Useful Link (optional)" className="flex-1 p-3 rounded-lg border bg-transparent" />
          </div>

          <button onClick={handlePost} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} {loading ? 'Uploading & Publishing...' : 'Publish'}
          </button>
        </div>
      )}

      <div className="space-y-5">
        {announcements.map(item => (
          <article key={item.id} className="bg-white dark:bg-slate-900 rounded-xl border overflow-hidden">
            {item.coverImageUrl && <img src={item.coverImageUrl} alt={item.title} className="w-full max-h-80 object-cover" loading="lazy" />}
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Megaphone size={15} /> {item.category} · {new Date(item.createdAt).toLocaleString()}</div>
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{item.content}</p>
              {item.videoUrl && (isYouTube(item.videoUrl) ? <div className="mt-4 aspect-video"><iframe src={youtubeEmbedUrl(item.videoUrl)} title={item.title} className="w-full h-full rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <video src={item.videoUrl} controls preload="metadata" className="mt-4 w-full rounded-lg max-h-[480px]" />)}
              {item.linkUrl && <a href={item.linkUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:underline"><ExternalLink size={16} /> Open Link</a>}
            </div>
          </article>
        ))}
        {announcements.length === 0 && <div className="text-center py-12 text-slate-500"><PlayCircle className="mx-auto mb-2" /> No IT guides yet.</div>}
      </div>
    </div>
  );
};

const supabasePublicUrl = (path: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/uploads/${path}`;
};
