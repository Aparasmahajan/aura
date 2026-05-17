import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { Pin, Megaphone, Clock, BookOpen, GraduationCap, ClipboardList } from 'lucide-react';
import './StudentHomePage.scss';

interface NewsPost {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  folderId: string | null;
  folderName?: string;
  postedByName?: string;
  createdAt: string;
}

const StudentHomePage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user } = useAuth();
  const { portal } = usePortal();
  const navigate = useNavigate();

  const [news, setNews] = useState<NewsPost[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsError, setNewsError] = useState('');

  useEffect(() => {
    if (!portal?.id) return;
    fetchNews();
  }, [portal?.id]);

  const fetchNews = async () => {
    setLoadingNews(true);
    // Load enrolled folders first, then fetch aggregated student news
    const foldersRes = await apiClient.getPortalFolders(portal!.id);
    const rawFolders = Array.isArray(foldersRes.data) ? foldersRes.data : [];
    const folderIds: string[] = rawFolders.map((f: any) => String(f.folderId ?? f.id));

    const res = await apiClient.getStudentNews(portal!.id, folderIds);
    setLoadingNews(false);
    if (res.error) { setNewsError(res.error); return; }
    const items: NewsPost[] = Array.isArray(res.data) ? res.data : [];
    items.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setNews(items);
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const quickLinks = [
    { label: 'Lectures', icon: <BookOpen size={22} />, to: `/${portalName}/student/lectures`, color: '#0ea5e9' },
    { label: 'Exams', icon: <GraduationCap size={22} />, to: `/${portalName}/student/exams`, color: '#8b5cf6' },
    { label: 'Assignments', icon: <ClipboardList size={22} />, to: `/${portalName}/student/assignments`, color: '#f59e0b' },
  ];

  return (
    <div className="student-home">
      <div className="page-header">
        <h1>Welcome back, {user?.fullName || user?.username} 👋</h1>
        <p>{portal?.display_name}</p>
      </div>

      {/* Quick links */}
      <div className="quick-links">
        {quickLinks.map(l => (
          <button key={l.label} className="quick-link-card" style={{ '--accent': l.color } as any}
            onClick={() => navigate(l.to)}>
            <span className="ql-icon">{l.icon}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>

      {/* News feed */}
      <section className="news-section">
        <div className="section-title-row">
          <Megaphone size={18} />
          <h2>Announcements</h2>
        </div>

        {loadingNews ? (
          <div className="spinner-center"><div className="spinner" /></div>
        ) : newsError ? (
          <p className="error-msg">{newsError}</p>
        ) : news.length === 0 ? (
          <div className="empty-state">
            <Megaphone size={40} />
            <p>No announcements yet</p>
          </div>
        ) : (
          <div className="news-list">
            {news.map(item => (
              <article key={item.id} className={`news-card${item.isPinned ? ' pinned' : ''}`}>
                <div className="news-card-header">
                  <div className="news-meta">
                    {item.isPinned && (
                      <span className="pin-badge"><Pin size={12} /> Pinned</span>
                    )}
                    {item.folderId && item.folderName && (
                      <span className="folder-badge">{item.folderName}</span>
                    )}
                    {!item.folderId && (
                      <span className="global-badge">Global</span>
                    )}
                  </div>
                  <div className="news-time">
                    <Clock size={12} />
                    <span>{timeAgo(item.createdAt)}</span>
                  </div>
                </div>
                <h3 className="news-title">{item.title}</h3>
                <p className="news-body">{item.body}</p>
                {item.postedByName && (
                  <p className="news-author">— {item.postedByName}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentHomePage;
