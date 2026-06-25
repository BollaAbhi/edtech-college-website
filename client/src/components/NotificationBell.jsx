import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const NotificationBell = () => {
  const [notices, setNotices] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load read notice IDs from localStorage
    const savedReadIds = localStorage.getItem('readNoticeIds');
    if (savedReadIds) {
      try {
        setReadIds(JSON.parse(savedReadIds));
      } catch (e) {
        console.error(e);
      }
    }

    // Fetch last 5 notices
    const fetchNotices = async () => {
      try {
        const res = await api.get('/notices?page=1&limit=5');
        if (res.data?.notices) {
          setNotices(res.data.notices);
        }
      } catch (err) {
        console.error('Failed to fetch notices for notification bell:', err);
      }
    };

    fetchNotices();

    // Poll for new notices every 60 seconds
    const interval = setInterval(fetchNotices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotices = notices.filter(n => !readIds.includes(n._id));
  const unreadCount = unreadNotices.length;

  const markAsRead = (id) => {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem('readNoticeIds', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const allIds = notices.map(n => n._id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem('readNoticeIds', JSON.stringify(updated));
  };

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-violet-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-850 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Recent Notices</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-violet-400 hover:text-violet-300 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-850">
            {notices.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No recent notices
              </div>
            ) : (
              notices.map((n) => {
                const isRead = readIds.includes(n._id);
                return (
                  <div
                    key={n._id}
                    onClick={() => !isRead && markAsRead(n._id)}
                    className={`p-4 hover:bg-slate-800/40 transition-colors cursor-pointer relative ${!isRead ? 'bg-violet-600/5' : ''}`}
                  >
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                            n.priority === 'urgent'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : n.priority === 'high'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {n.priority}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white line-clamp-1">{n.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{n.content}</p>
                      </div>
                      {!isRead && (
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n._id);
                            }}
                            className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-white transition-colors"
                            title="Mark as read"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
