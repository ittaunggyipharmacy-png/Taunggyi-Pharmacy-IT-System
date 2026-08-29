import React, { useState, useEffect } from 'react';
import { Send, Loader2, MessageSquare, Megaphone } from 'lucide-react';
import { postAnnouncement, subscribeToAnnouncements, ItAnnouncement } from '../../services/itAnnouncementService';
import { useAuth } from '../../features/auth/hooks/useAuth';
import toast from 'react-hot-toast';

export const ItAnnouncementModule = ({ isAdmin }: { isAdmin: boolean }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [announcements, setAnnouncements] = useState<ItAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => setAnnouncements(data));
    return () => unsubscribe();
  }, []);

  const handlePostAnnouncement = async () => {
    if (!message.trim() || !currentUser || !isAdmin) return;
    
    setLoading(true);
    try {
      await postAnnouncement(currentUser.id, currentUser.email || 'Admin', message);
      setMessage('');
      toast.success('ကြေညာချက် တင်ပြီးပါပြီ။');
    } catch (error) {
      toast.error('ကြေညာချက် တင်၍မရပါ။');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">IT Announcements</h1>
      
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-6 mb-8">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="IT ကြေညာချက် အသစ်ရေးရန်..."
            className="w-full p-3 rounded-lg border mb-4 focus:ring-2 focus:ring-indigo-500 bg-transparent"
            rows={3}
          />
          <button
            onClick={handlePostAnnouncement}
            disabled={loading || !message.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Post Announcement
          </button>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Announcements</h2>
        {announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border flex items-start gap-4">
            <Megaphone className="text-indigo-500 shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">{new Date(announcement.createdAt).toLocaleString()}</p>
              <p className="text-slate-800 dark:text-slate-200 mt-1">{announcement.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};