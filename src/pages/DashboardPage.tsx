import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import { apiClient } from '../utils/api';
import { Folder, FolderPlus, LogOut, User, Shield, UserPlus, X, AlertCircle, CheckCircle, Search, ArrowLeft, UserCheck, Megaphone, Pin, Trash2, Bell } from 'lucide-react';
import './DashboardPage.scss';

const SubAdminPanel = lazy(() => import('./SubAdminPanel'));
const AdministratorPanel = lazy(() => import('./AdministratorPanel'));

const DashboardPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { portal, folders, setFolders, userRole, setUserRole, isPortalAdmin, setIsPortalAdmin } = usePortal();
  const [emails, setEmails] = useState<
    { email: string; userId: number | null; loading: boolean; error?: string }[]
  >([{ email: '', userId: null, loading: false }]);



  const loadedPortalIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    isUniversal: false,
    isPaid: false,
    price: '',
    accessDurationInDays: '',
    parentFolderId: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Student onboarding
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardMode, setOnboardMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [onboardForm, setOnboardForm] = useState({
    username: '', email: '', password: '', fullName: '',
    course: '', specialization: '', year: '', semester: '', phone: '',
  });
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState('');
  const [onboardSuccess, setOnboardSuccess] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Announcements (portal-level)
  const [showAnnouncementsPanel, setShowAnnouncementsPanel] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [annForm, setAnnForm] = useState({ title: '', body: '', isPinned: false });
  const [annPosting, setAnnPosting] = useState(false);
  const [annError, setAnnError] = useState('');

  // Students never land here — send them to their portal
  useEffect(() => {
    if (user?.role === 'student') {
      navigate(`/${portalName}/student/home`, { replace: true });
    }
  }, [user?.role]);

  useEffect(() => {
    const hasToken = apiClient.isAuthenticated();
    if (!isAuthenticated && !hasToken) {
      navigate(`/${portalName}/login`);
      return;
    }

    if (!portal) {
      navigate(`/${portalName}`);
      return;
    }

    // Skip if already fetched for this portal or a fetch is in-flight
    if (portal.id === loadedPortalIdRef.current || isFetchingRef.current) return;

    loadFolders();
  }, [isAuthenticated, portal]);

  useEffect(() => {
    if (!user) return;
    const portalAdminIds: string[] = JSON.parse(sessionStorage.getItem('portal_admin_ids') || '[]');
    setIsPortalAdmin(portalAdminIds.includes(String(user.id)));
  }, [user]);

  const loadFolders = async () => {
    if (!portal || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError('');

    const response = await apiClient.getPortalFolders(portal.id);

    if (response.error) {
      setError(response.error);
      setIsLoading(false);
      isFetchingRef.current = false;
      return;
    }

    if (response.data) {
      const arrayData = response.data?.data ?? response.data;
      setFolders(Array.isArray(arrayData) ? arrayData.map((f: any) => ({
        id: String(f.folderId ?? f.id),
        portal_id: String(f.portalId ?? f.portal_id ?? portal.id),
        parent_id: f.parentFolderId != null ? String(f.parentFolderId) : (f.parent_id ?? null),
        name: f.name,
        description: f.description ?? '',
        isUniversal: !!(f.isUniversal ?? f.is_universal),
        canEdit: !!f.canEdit,
        canView: !f.canEdit,
        created_by: f.createdByUserId ? String(f.createdByUserId) : '',
        created_at: f.createdAt ?? '',
        updated_at: f.updatedAt ?? '',
      })) : []);
      // setUserRole(null);
      // setIsPortalAdmin(false);
    }

    loadedPortalIdRef.current = portal.id;
    isFetchingRef.current = false;
    setIsLoading(false);
  };

  const openAnnouncements = async () => {
    setShowAnnouncementsPanel(true);
    setAnnError('');
    if (!portal?.id) return;
    setAnnouncementsLoading(true);
    const res = await apiClient.getNews({ portalId: portal.id });
    setAnnouncementsLoading(false);
    setAnnouncements(Array.isArray(res.data) ? res.data : []);
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portal?.id || !annForm.title || !annForm.body) return;
    setAnnPosting(true);
    setAnnError('');
    const res = await apiClient.createNews({
      portalId: portal.id,
      scope: 'PORTAL',
      title: annForm.title,
      body: annForm.body,
      isPinned: annForm.isPinned,
    });
    setAnnPosting(false);
    if (res.error) { setAnnError(res.error); return; }
    setAnnForm({ title: '', body: '', isPinned: false });
    const refreshed = await apiClient.getNews({ portalId: portal.id });
    setAnnouncements(Array.isArray(refreshed.data) ? refreshed.data : []);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await apiClient.deleteNews(id);
    setAnnouncements(prev => prev.filter((a: any) => String(a.newsId ?? a.id) !== id));
  };

  const handleLogout = () => {
    logout();
    navigate(`/${portalName}/login`);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const userIds: number[] = [];

      for (const item of emails) {
        if (!item.email) continue;
        if (item.userId !== null) {
          userIds.push(item.userId);
          continue;
        }
      }

      const folderData: any = {
        portalName: portal?.name || portal?.display_name || '',
        name: createForm.name,
        description: createForm.description || undefined,
        isUniversal: createForm.isUniversal,
        price: createForm.isPaid && createForm.price ? parseFloat(createForm.price) : undefined,
        accessDurationInDays: createForm.isPaid && createForm.accessDurationInDays ? parseInt(createForm.accessDurationInDays) : undefined,
        parentFolderId: createForm.parentFolderId ? parseInt(createForm.parentFolderId) : undefined,
        userIds: userIds.length > 0 ? userIds : undefined,
      };

      const res: any = await apiClient.createFolder(folderData);

      if (res.status === 'FAILURE' && res?.responseCode === 5000) {
        // Specific access error
        setCreateError("You don't have access to this");
      } else if (res.error) {
        setCreateError(res.error || 'Failed to create folder');
      } else {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          description: '',
          isUniversal: false,
          isPaid: false,
          price: '',
          accessDurationInDays: '',
          parentFolderId: '',
        });
        setEmails([{ email: '', userId: null, loading: false }]);
        await loadFolders();
      }
    } catch (err) {
      setCreateError('Failed to create folder');
    }

    setCreateLoading(false);
  };



  const getRootFolders = () => {
    return folders.filter(f => f.parent_id == null || f.parent_id === '' || f.parent_id === 'null');
  };

  const getSubfolders = (parentId: string) => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const canCreateFolders = user?.role === 'super' || isPortalAdmin;

  const canOnboardStudents =
    user?.role === 'super' || user?.role === 'admin' ||
    user?.role === 'sub_admin' || user?.role === 'administrator';

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const res = await apiClient.searchStudents(q.trim());
      setSearchLoading(false);
      setSearchResults(res.data ?? []);
    }, 400);
  };

  const handleEnroll = async (student: any) => {
    if (!portal?.id) return;
    setEnrollingId(student.userId);
    const res = await apiClient.enrollStudentToPortal(student.userId, portal.id);
    setEnrollingId(null);
    if (res.error) { setOnboardError(res.error); return; }
    setEnrolledIds(prev => new Set(prev).add(student.userId));
  };

  const closeOnboardModal = () => {
    setShowOnboardModal(false);
    setOnboardMode('search');
    setSearchQuery('');
    setSearchResults([]);
    setOnboardError('');
    setOnboardSuccess('');
    setEnrolledIds(new Set());
    setOnboardForm({ username: '', email: '', password: '', fullName: '', course: '', specialization: '', year: '', semester: '', phone: '' });
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    setOnboardError('');
    setOnboardSuccess('');
    const res = await apiClient.onboardStudent({
      ...onboardForm,
      portalId: portal?.id,
    });
    setOnboardLoading(false);
    if (res.error) { setOnboardError(res.error); return; }
    setOnboardSuccess(`Student "${onboardForm.username}" created and enrolled successfully!`);
    setOnboardForm({ username: '', email: '', password: '', fullName: '', course: '', specialization: '', year: '', semester: '', phone: '' });
  };

  // Role-based panel rendering — only admin/super see full folder dashboard
  if (user?.role === 'sub_admin') {
    return (
      <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
        <SubAdminPanel />
      </Suspense>
    );
  }

  if (user?.role === 'administrator') {
    return (
      <Suspense fallback={<div className="page-loading"><div className="spinner" /></div>}>
        <AdministratorPanel />
      </Suspense>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="portal-info">
            {portal?.logo_url && (
              <img src={portal.logo_url} alt={portal.display_name} className="portal-logo-small" />
            )}
            <div>
              <h1>{portal?.display_name}</h1>
              <p className="portal-description">{portal?.description}</p>
            </div>
          </div>

          <div className="user-section">
            <div className="user-info">
              <User size={20} />
              <span>{user?.username}</span>
              {(isPortalAdmin || (user?.role && user.role !== 'student')) && (
                <span className={`role-badge role-${isPortalAdmin ? 'admin' : user?.role}`}>
                  {isPortalAdmin ? 'ADMIN' : user?.role?.toUpperCase().replace('_', ' ')}
                </span>
              )}
            </div>
            {canOnboardStudents && (
              <button className="btn-onboard" onClick={() => { setShowOnboardModal(true); setOnboardMode('search'); }}>
                <UserPlus size={17} />
                Onboard Student
              </button>
            )}
            {canOnboardStudents && (
              <button className="btn-announce" onClick={openAnnouncements}>
                <Bell size={17} />
                Announcements
              </button>
            )}
            {user?.role === 'super' && (
              <button className="btn-admin" onClick={() => navigate('/admn')}>
                <Shield size={18} />
                Admin Panel
              </button>
            )}
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="content-header">
            <h2>Folders</h2>
            {canCreateFolders && (
              <>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                  <FolderPlus size={20} />
                  Create Folder
                </button>
                {showCreateModal && (
                  <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
                    <div className="modal create-folder-modal">
                      <div className="modal-header">
                        <h3>Create Folder</h3>
                        <button className="modal-close" type="button" onClick={() => setShowCreateModal(false)}>✕</button>
                      </div>

                      <form onSubmit={handleCreateFolder}>
                        {/* Basic Info */}
                        <div className="form-section">
                          <div className="form-field">
                            <label className="field-label">Folder Name <span className="required">*</span></label>
                            <input
                              type="text"
                              placeholder="e.g. Physics Notes"
                              value={createForm.name}
                              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div className="form-field">
                            <label className="field-label">Description</label>
                            <textarea
                              placeholder="Brief description (optional)"
                              value={createForm.description}
                              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Access Toggles */}
                        <div className="form-section">
                          <p className="section-label">Access Settings</p>

                          <div className="toggle-row">
                            <div className="toggle-info">
                              <span className="toggle-label">Universal Access</span>
                              <span className="toggle-desc">Anyone in the portal can view this folder</span>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={createForm.isUniversal}
                                onChange={e => setCreateForm(f => ({ ...f, isUniversal: e.target.checked }))}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </div>

                          <div className="toggle-row">
                            <div className="toggle-info">
                              <span className="toggle-label">Paid Access</span>
                              <span className="toggle-desc">Require payment to access this folder</span>
                            </div>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={createForm.isPaid}
                                onChange={e => setCreateForm(f => ({ ...f, isPaid: e.target.checked, price: '', accessDurationInDays: '' }))}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </div>

                          {createForm.isPaid && (
                            <div className="paid-fields">
                              <div className="form-field half">
                                <label className="field-label">Price (₹) <span className="required">*</span></label>
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                  value={createForm.price}
                                  onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
                                  required={createForm.isPaid}
                                />
                              </div>
                              <div className="form-field half">
                                <label className="field-label">Access Duration (days) <span className="required">*</span></label>
                                <input
                                  type="number"
                                  placeholder="e.g. 30"
                                  min="1"
                                  value={createForm.accessDurationInDays}
                                  onChange={e => setCreateForm(f => ({ ...f, accessDurationInDays: e.target.value }))}
                                  required={createForm.isPaid}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* User Access */}
                        <div className="form-section">
                          <p className="section-label">Grant Admin rights to User <span className="section-optional">(optional)</span></p>
                          <div className="emails-inputs">
                            {emails.map((item, index) => (
                              <div key={index} className="email-row">
                                <div className="email-input-wrap">
                                  <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={item.email}
                                    onChange={e => {
                                      const newEmails = [...emails];
                                      newEmails[index].email = e.target.value;
                                      newEmails[index].userId = null;
                                      newEmails[index].error = '';
                                      setEmails(newEmails);
                                    }}
                                    onBlur={async () => {
                                      if (!item.email || item.userId || item.loading) return;
                                      const newEmails = [...emails];
                                      newEmails[index].loading = true;
                                      setEmails([...newEmails]);
                                      try {
                                        const res = await apiClient.getUserByEmail(item.email);
                                        newEmails[index].loading = false;
                                        if (res?.data) {
                                          newEmails[index].userId = res.data;
                                          newEmails[index].error = '';
                                        } else {
                                          newEmails[index].userId = null;
                                          newEmails[index].error = 'User not found';
                                        }
                                      } catch {
                                        newEmails[index].loading = false;
                                        newEmails[index].userId = null;
                                        newEmails[index].error = 'User not found';
                                      }
                                      setEmails([...newEmails]);
                                    }}
                                    disabled={item.userId !== null}
                                  />
                                  {item.loading && <span className="field-status loading">Checking...</span>}
                                  {item.userId !== null && !item.loading && <span className="field-status success">✓ Found</span>}
                                  {item.error && <span className="field-status error">{item.error}</span>}
                                </div>
                                {emails.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn-remove"
                                    onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                                  >✕</button>
                                )}
                              </div>
                            ))}
                            {emails[emails.length - 1]?.error === '' && (
                              <button
                                type="button"
                                className="btn-add-email"
                                onClick={() => setEmails([...emails, { email: '', userId: null, loading: false }])}
                              >
                                + Add another email
                              </button>
                            )}
                          </div>
                        </div>

                        {createError && <div className="error-message">{createError}</div>}

                        <div className="modal-actions">
                          <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                            Cancel
                          </button>
                          <button type="submit" className="btn-primary" disabled={createLoading}>
                            {createLoading ? 'Creating...' : 'Create Folder'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading folders...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={loadFolders} className="btn-secondary">Retry</button>
            </div>
          ) : folders.length === 0 ? (
            <div className="empty-state">
              <Folder size={64} />
              <h3>No folders yet</h3>
              <p>
                {canCreateFolders
                  ? 'Create your first folder to get started'
                  : 'No folders have been shared with you yet'}
              </p>
            </div>
          ) : (
            <div className="folders-grid">
              {getRootFolders().map(folder => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  subfolders={getSubfolders(folder.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Announcements panel ── */}
      {showAnnouncementsPanel && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAnnouncementsPanel(false); }}>
          <div className="modal ann-modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Megaphone size={18} color="#8b5cf6" />
                <h3>Announcements</h3>
              </div>
              <button className="modal-close" type="button" onClick={() => setShowAnnouncementsPanel(false)}><X size={18} /></button>
            </div>

            {/* Create form */}
            <div className="ann-create-section">
              <form onSubmit={handlePostAnnouncement} className="ann-form">
                <input
                  required
                  placeholder="Title…"
                  value={annForm.title}
                  onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))}
                />
                <textarea
                  required
                  rows={3}
                  placeholder="Write your announcement…"
                  value={annForm.body}
                  onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))}
                />
                <div className="ann-form-footer">
                  <label className="ann-pin-toggle">
                    <input type="checkbox" checked={annForm.isPinned} onChange={e => setAnnForm(f => ({ ...f, isPinned: e.target.checked }))} />
                    <Pin size={13} /> Pin this
                  </label>
                  {annError && <span className="ann-error">{annError}</span>}
                  <button type="submit" className="btn-post-ann" disabled={annPosting}>
                    {annPosting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="ann-list">
              {announcementsLoading && <p className="ann-hint">Loading…</p>}
              {!announcementsLoading && announcements.length === 0 && (
                <p className="ann-hint">No announcements yet.</p>
              )}
              {announcements.map((a: any) => {
                const id = String(a.newsId ?? a.id);
                return (
                  <div key={id} className={`ann-item${a.isPinned ? ' pinned' : ''}`}>
                    <div className="ann-item-head">
                      <div className="ann-item-meta">
                        {a.isPinned && <span className="ann-pin-badge"><Pin size={11} /> Pinned</span>}
                        <span className="ann-scope-badge">{a.scope ?? 'PORTAL'}</span>
                      </div>
                      <button className="ann-delete" onClick={() => handleDeleteAnnouncement(id)}><Trash2 size={14} /></button>
                    </div>
                    <h4 className="ann-item-title">{a.title}</h4>
                    <p className="ann-item-body">{a.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Student onboarding modal */}
      {showOnboardModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeOnboardModal(); }}>
          <div className="modal onboard-modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {onboardMode === 'create' && (
                  <button className="modal-close" type="button" onClick={() => { setOnboardMode('search'); setOnboardError(''); setOnboardSuccess(''); }}>
                    <ArrowLeft size={17} />
                  </button>
                )}
                <h3>{onboardMode === 'search' ? 'Enroll Student' : 'Create New Student'}</h3>
              </div>
              <button className="modal-close" type="button" onClick={closeOnboardModal}>
                <X size={18} />
              </button>
            </div>

            {onboardMode === 'search' ? (
              <div className="onboard-search-pane">
                <div className="onboard-search-bar">
                  <Search size={16} className="search-icon" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by roll no, name or email…"
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                  />
                </div>

                {onboardError && (
                  <div className="onboard-error"><AlertCircle size={14} /> {onboardError}</div>
                )}

                <div className="search-results-list">
                  {searchLoading && <p className="search-hint">Searching…</p>}
                  {!searchLoading && searchQuery && searchResults.length === 0 && (
                    <p className="search-hint">No students found.</p>
                  )}
                  {!searchLoading && !searchQuery && (
                    <p className="search-hint">Type to search existing students.</p>
                  )}
                  {searchResults.map((s: any) => {
                    const done = enrolledIds.has(s.userId);
                    return (
                      <div key={s.userId} className="student-result-row">
                        <div className="student-result-avatar">{(s.fullName || s.username || '?')[0].toUpperCase()}</div>
                        <div className="student-result-info">
                          <span className="student-result-name">{s.fullName || s.username}</span>
                          <span className="student-result-meta">
                            {s.username}{s.course ? ` · ${s.course}` : ''}{s.year ? ` · Year ${s.year}` : ''}
                          </span>
                        </div>
                        <button
                          className={`btn-enroll${done ? ' enrolled' : ''}`}
                          disabled={done || enrollingId === s.userId}
                          onClick={() => handleEnroll(s)}
                        >
                          {done ? <><CheckCircle size={14} /> Enrolled</> : enrollingId === s.userId ? 'Enrolling…' : <><UserCheck size={14} /> Enroll</>}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="onboard-divider">
                  <span>or</span>
                </div>
                <button className="btn-create-new" onClick={() => { setOnboardMode('create'); setOnboardError(''); }}>
                  <UserPlus size={16} /> Create New Student Account
                </button>
              </div>
            ) : (
              <form onSubmit={handleOnboard}>
                <div className="onboard-grid">
                  <div className="form-field">
                    <label className="field-label">Roll Number (Username) <span className="required">*</span></label>
                    <input required value={onboardForm.username} onChange={e => setOnboardForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. 2024CS001" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Full Name</label>
                    <input value={onboardForm.fullName} onChange={e => setOnboardForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Student full name" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Email <span className="required">*</span></label>
                    <input required type="email" value={onboardForm.email} onChange={e => setOnboardForm(f => ({ ...f, email: e.target.value }))} placeholder="student@example.com" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Password <span className="required">*</span></label>
                    <input required type="password" value={onboardForm.password} onChange={e => setOnboardForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Course / Program</label>
                    <input value={onboardForm.course} onChange={e => setOnboardForm(f => ({ ...f, course: e.target.value }))} placeholder="e.g. B.Tech, MBA, B.Sc" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Specialization / Branch</label>
                    <input value={onboardForm.specialization} onChange={e => setOnboardForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Computer Science, Finance" />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Year</label>
                    <select value={onboardForm.year} onChange={e => setOnboardForm(f => ({ ...f, year: e.target.value }))}>
                      <option value="">Select year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                      <option value="5">5th Year</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="field-label">Semester</label>
                    <select value={onboardForm.semester} onChange={e => setOnboardForm(f => ({ ...f, semester: e.target.value }))}>
                      <option value="">Select semester</option>
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={String(n)}>Sem {n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="field-label">Phone</label>
                    <input type="tel" value={onboardForm.phone} onChange={e => setOnboardForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                  </div>
                </div>

                {onboardError && (
                  <div className="onboard-error"><AlertCircle size={14} /> {onboardError}</div>
                )}
                {onboardSuccess && (
                  <div className="onboard-success"><CheckCircle size={14} /> {onboardSuccess}</div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={closeOnboardModal}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={onboardLoading}>
                    {onboardLoading ? 'Creating…' : 'Create & Enroll'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface FolderCardProps {
  folder: any;
  subfolders: any[];
}

const FolderCard: React.FC<FolderCardProps> = ({ folder, subfolders }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canOpen = folder.canEdit || folder.isUniversal;
  const navigate = useNavigate();
  const { portalName } = useParams<{ portalName: string }>();

  return (
    <div className="folder-card">
      <div
        className="folder-header"
        onClick={() => {
          if (!canOpen) return;
          // navigate to FolderDetailsPage
          navigate(`/${portalName}/folder/${folder.id}`);
        }}
        style={!canOpen ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
      >
        <div className="folder-icon">
          <Folder size={24} />
        </div>
        <div className="folder-details">
          <h3>{folder.name}</h3>
          {folder.description && <p className="folder-description">{folder.description}</p>}
        </div>
        <div className="folder-actions">
          {folder.canEdit ? (
            <button className="btn-secondary">Edit</button>
          ) : folder.isUniversal ? (
            <span className="permission-badge view-only">View Only</span>
          ) : (
            <span className="permission-badge view-only">Restricted</span>
          )}
        </div>
      </div>

      {subfolders.length > 0 && isExpanded && (
        <div className="subfolders">
          {subfolders.map(subfolder => (
            <div
              key={subfolder.id}
              className="subfolder-item"
              onClick={() => navigate(`/${portalName}/folder/${subfolder.id}`)}
            >
              <Folder size={18} />
              <span>{subfolder.name}</span>
              {subfolder.canEdit && <span className="permission-badge small">Edit</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
