import React, { useState, useEffect } from 'react';
import { Send, Loader2, MessageSquare, CheckCircle } from 'lucide-react';
import { sendItPing, subscribeToPings, ItPing } from '../../services/itPingService';
import { useAuth } from '../../features/auth/hooks/useAuth';
import toast from 'react-hot-toast';

export const ItPingModule = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [pings, setPings] = useState<ItPing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToPings((data) => setPings(data));
    return () => unsubscribe();
  }, []);

  const handleSendPing = async () => {
    if (!message.trim() || !user) return;
    
    setLoading(true);
    try {
      await sendItPing(user.uid, user.email || 'User', message);
      setMessage('');
      toast.success('IT သို့ မက်ဆေ့ချ် ပို့ပြီးပါပြီ။');
    } catch (error) {
      toast.error('မက်ဆေ့ချ် ပို့၍မရပါ။');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">IT Ping Support</h1>
      
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border p-6 mb-8">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="IT သို့ ပို့လိုသည့် မက်ဆေ့ချ်ကို ရေးပါ..."
          className="w-full p-3 rounded-lg border mb-4 focus:ring-2 focus:ring-indigo-500 bg-transparent"
          rows={3}
        />
        <button
          onClick={handleSendPing}
          disabled={loading || !message.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          Send Ping
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Message History</h2>
        {pings.map((ping) => (
          <div key={ping.id} className="bg-white dark:bg-slate-900 p-4 rounded-lg border flex items-start gap-4">
            <MessageSquare className="text-slate-400 shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">{ping.userName}</p>
              <p className="text-slate-600 dark:text-slate-300">{ping.message}</p>
            </div>
            {ping.status === 'resolved' && <CheckCircle className="text-emerald-500" size={20} />}
          </div>
        ))}
      </div>
    </div>
  );
};
