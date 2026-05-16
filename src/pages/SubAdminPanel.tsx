import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import { apiClient } from '../utils/api';
import { Folder, Book, GraduationCap, ClipboardList, Megaphone, ChevronRight, Plus, X } from 'lucide-react';
import './SubAdminPanel.scss';

type Tab = 'folders' | 'news';

const SubAdminPanel: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user } = useAuth();
  const { portal, folders } = usePortal();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('folders');
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // news form
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsFolderId, setNewsFolderId] = useState<string>('');
  const [newsPinned, setNewsPinned] = useState(false);
  const [newsPosting, setNewsPosting] = useState(false);
  const [newsError, setNewsError] = useState('');

  // owned folders = folders where canEdit is true
  const ownedFolders = folders.filter(f => f.canEdit);

  useEffect(() => {
    if (tab === 'news') loadNews();
  }, [tab, portal?.id]);

  const loadNews = async () => {
    if (!portal?.id) return;
    setNewsLoading(true);
    const res = await apiClient.getNews({ portalId: portal.id });
    setNewsLoading(false);
    if (res.data) {
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setNews(items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsBody) { setNewsError('Title and body are required.'); return; }
    setNewsPosting(true);
    setNewsError('');
    const res = await apiClient.createNews({
      portalId: portal!.id,
      folderId: newsFolderId || null,
      title: newsTitle,
      body: newsBody,
      isPinned: newsPinned,
    });
    setNewsPosting(false);
    if (res.error) { setNewsError(res.error); return; }
    setShowNewsForm(false);
    setNewsTitle(''); setNewsBody(''); setNewsFolderId(''); setNewsPinned(false);
    loadNews();
  };

  const handleDeleteNews = async (id: string) => {
    await apiClient.deleteNews(id);
    setNews(prev => prev.filter(n => n.id !== id));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="sub-admin-panel">
      <div className="panel-header">
        <h1>Sub-Admin Panel</h1>
        <p>Manage your assigned folders, content, and announcements</p>
      </div>

      <div className="panel-tabs">
        <button className={`panel-tab${tab === 'folders' ? ' active' : ''}`} onClick={() => setTab('folders')}>
          <Folder size={16} /> My Folders
        </button>
        <button className={`panel-tab${tab === 'news' ? ' active' : ''}`} onClick={() => setTab('news')}>
          <Megaphone size={16} /> Announcements
        </button>
      </div>

      {/* ── My Folders tab ────────────────────────────────── */}
      {tab === 'folders' && (
        <div className="folders-section">
          {ownedFolders.length === 0 ? (
            <div className="empty-state">
              <Folder size={48} />
              <p>No folders have been assigned to you yet. Contact the Dean.</p>
            </div>
          ) : (
            <div className="owned-folders-list">
              {ownedFolders.map(folder => (
                <div key={folder.id} className="owned-folder-card">
                  <div className="ofc-left" onClick={() => navigate(`/${portalName}/folder/${folder.id}`)}>
                    <Folder size={22} className="folder-icon" />
                    <div>
                      <h3>{folder.name}</h3>
                      {folder.description && <p>{folder.description}</p>}
                    </div>
                  </div>
                  <div className="ofc-actions">
                    <button className="ofc-btn" onClick={() => navigate(`/${portalName}/folder/${folder.id}`)}>
                      <Book size={14} /> Content
                    </button>
                    <ChevronRight size={18} className="arrow" onClick={() => navigate(`/${portalName}/folder/${folder.id}`)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Announcements tab ─────────────────────────────── */}
      {tab === 'news' && (
        <div className="news-section">
          <div className="news-actions-row">
            <button className="btn-post-news" onClick={() => setShowNewsForm(true)}>
              <Plus size={15} /> Post Announcement
            </button>
          </div>

          {showNewsForm && (
            <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewsForm(false); }}>
              <div className="news-form-modal">
                <div className="nfm-header">
                  <h3>Post Announcement</h3>
                  <button onClick={() => setShowNewsForm(false)}><X size={18} /></button>
                </div>
                <form className="nfm-body" onSubmit={handlePostNews}>
                  <label>Title *</label>
                  <input value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="Announcement title" required />

                  <label>Body *</label>
                  <textarea rows={4} value={newsBody} onChange={e => setNewsBody(e.target.value)} placeholder="Write your announcement..." required />

                  <label>Target (optional)</label>
                  <select value={newsFolderId} onChange={e => setNewsFolderId(e.target.value)}>
                    <option value="">Global (all students in portal)</option>
                    {ownedFolders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>

                  <label className="toggle-label-row">
                    <input type="checkbox" checked={newsPinned} onChange={e => setNewsPinned(e.target.checked)} />
                    Pin this announcement
                  </label>

                  {newsError && <p className="form-error">{newsError}</p>}

                  <div className="nfm-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowNewsForm(false)}>Cancel</button>
                    <button type="submit" className="btn-post" disabled={newsPosting}>
                      {newsPosting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {newsLoading ? (
            <div className="spinner-center"><div className="spinner" /></div>
          ) : news.length === 0 ? (
            <div className="empty-state">
              <Megaphone size={48} />
              <p>No announcements yet</p>
            </div>
          ) : (
            <div className="news-items">
              {news.map(n => (
                <div key={n.id} className={`news-item${n.isPinned ? ' pinned' : ''}`}>
                  <div className="ni-header">
                    <span className="ni-title">{n.title}</span>
                    <div className="ni-meta">
                      {n.isPinned && <span className="pin-chip">Pinned</span>}
                      {n.folderId ? <span className="scope-chip folder">Folder</span> : <span className="scope-chip global">Global</span>}
                      <span className="ni-time">{timeAgo(n.createdAt)}</span>
                      <button className="btn-del-news" onClick={() => handleDeleteNews(n.id)}><X size={13} /></button>
                    </div>
                  </div>
                  <p className="ni-body">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubAdminPanel;
