import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, FolderPlus, Book, X, UserCheck, Trash2, Shield, UserPlus, AlertCircle, CheckCircle, Search, Users } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import CreateFolderModal from '../pages/CreateFolderModal';
import CreateContentModal from '../pages/CreateContentModal';
import ContentRenderer from '../components/ContentRenderer';
import VideoPlayer from '../components/VideoPlayer';
import AudioPlayer from '../components/AudioPlayer';
import PDFViewer from '../components/PDFViewer';
import BlogContent from '../components/BlogContent';

import './FolderDetailsPage.scss';

interface FolderDetails {
    folderId: number;
    portalId: number;
    name: string;
    description?: string;
    subFolders: FolderDetails[];
    contents: ContentItem[];
    isRoot: boolean;
    isUniversal: boolean;
    price?: number;
    accessDurationInDays?: number;
    canEdit?: boolean;  // added
    createdAt: string;
    updatedAt: string;
}

interface MediaMetadata {
    mediaMetadataId: number;
    mimeType: string;
    duration?: string;
    pageCount?: number;
    resolution?: string;
    thumbnailUrl?: string;
}

interface ContentItem {
    contentId: number;
    type: string;
    title: string;
    description?: string;
    fileUrl?: string;
    textContent?: string;
    sizeInBytes?: number;
    mediaMetadata?: MediaMetadata;
    createdAt: string;
    updatedAt: string;
}

const FolderDetailsPage: React.FC = () => {
    const { folderId, portalName } = useParams<{ folderId: string; portalName: string }>();
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();

    const [folder, setFolder] = useState<FolderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateContentModal, setShowCreateContentModal] = useState(false);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [showContentModal, setShowContentModal] = useState(false);
    const [isPortalAdmin, setIsPortalAdmin] = useState(false);
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessUsers, setAccessUsers] = useState<{ userId: number; email: string }[]>([]);
    const [accessEmailInput, setAccessEmailInput] = useState('');
    const [accessEmailLoading, setAccessEmailLoading] = useState(false);
    const [accessEmailError, setAccessEmailError] = useState('');
    const [accessLoading, setAccessLoading] = useState(false);
    const [accessError, setAccessError] = useState('');
    const [accessSuccess, setAccessSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Student management modal
    const [showOnboardModal, setShowOnboardModal] = useState(false);
    const [modalMode, setModalMode] = useState<'list' | 'create'>('list');

    // Enrolled students list
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
    const [enrolledLoading, setEnrolledLoading] = useState(false);
    const [studentFilter, setStudentFilter] = useState('');
    const [revoking, setRevoking] = useState<Record<number, boolean>>({});

    // Add existing student search
    const [addQuery, setAddQuery] = useState('');
    const [addResults, setAddResults] = useState<any[]>([]);
    const [addSearchLoading, setAddSearchLoading] = useState(false);
    const [adding, setAdding] = useState<Record<number, boolean>>({});
    const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
    const addTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Create new student form
    const [onboardForm, setOnboardForm] = useState({
        username: '', email: '', password: '', fullName: '',
        course: '', specialization: '', year: '', semester: '', phone: '',
    });
    const [onboardLoading, setOnboardLoading] = useState(false);
    const [onboardError, setOnboardError] = useState('');
    const [onboardSuccess, setOnboardSuccess] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/${portalName}/login`);
            return;
        }
        
        let isCancelled = false;

        const fetchFolder = async () => {
            if (!folderId || isCancelled) return;
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.getFolderDetails(Number(folderId));
                if (!isCancelled) {
            if (res.error) {
                setError(res.error);
            } else {
                setFolder(res?.data?.data);
                    }
            }
        } catch {
                if (!isCancelled) {
            setError('Failed to load folder details');
        }
            }
            if (!isCancelled) {
        setLoading(false);
            }
        };
        
        fetchFolder();
        
        return () => {
            isCancelled = true;
        };
    }, [folderId, isAuthenticated]);


    useEffect(() => {
        if (!user) return;
        const ids: string[] = JSON.parse(sessionStorage.getItem('portal_admin_ids') || '[]');
        setIsPortalAdmin(ids.includes(String(user.id)));
    }, [user]);

    const canManage = isPortalAdmin || !!folder?.canEdit;

    const handleDelete = async () => {
        if (!folder) return;
        setDeleteLoading(true);
        setDeleteError('');
        const res = await apiClient.deleteFolder(folder.folderId);
        setDeleteLoading(false);
        if (res.error) {
            setDeleteError(res.error);
        } else {
            navigate(-1);
        }
    };

    const loadEnrolledStudents = async () => {
        if (!folder) return;
        setEnrolledLoading(true);
        const accessRes = await apiClient.getFolderAccessUsers(folder.folderId);
        if (accessRes.error || !accessRes.data?.length) {
            setEnrolledStudents([]);
            setEnrolledLoading(false);
            return;
        }
        const ids: number[] = accessRes.data.map((a: any) => a.userId);
        const usersRes = await apiClient.getUsersByIds(ids);
        const users: any[] = usersRes.data ?? [];
        // merge grantedAt from access list
        const merged = users.map(u => {
            const access = accessRes.data.find((a: any) => a.userId === u.userId);
            return { ...u, grantedAt: access?.grantedAt };
        });
        setEnrolledStudents(merged);
        setEnrolledLoading(false);
    };

    const openManageModal = () => {
        setShowOnboardModal(true);
        setModalMode('list');
        setStudentFilter('');
        setAddQuery('');
        setAddResults([]);
        setAddedIds(new Set());
        setOnboardError('');
        setOnboardSuccess('');
        setOnboardForm({ username: '', email: '', password: '', fullName: '', course: '', specialization: '', year: '', semester: '', phone: '' });
        loadEnrolledStudents();
    };

    const closeManageModal = () => {
        setShowOnboardModal(false);
    };

    const handleRevoke = async (student: any) => {
        if (!folder) return;
        setRevoking(r => ({ ...r, [student.userId]: true }));
        const res = await apiClient.revokeFolderAccess(folder.folderId, student.userId);
        setRevoking(r => ({ ...r, [student.userId]: false }));
        if (!res.error) {
            setEnrolledStudents(prev => prev.filter(s => s.userId !== student.userId));
        }
    };

    const handleAddSearch = (q: string) => {
        setAddQuery(q);
        if (addTimerRef.current) clearTimeout(addTimerRef.current);
        if (!q.trim()) { setAddResults([]); return; }
        addTimerRef.current = setTimeout(async () => {
            setAddSearchLoading(true);
            const res = await apiClient.searchStudents(q.trim());
            setAddSearchLoading(false);
            setAddResults(res.data ?? []);
        }, 400);
    };

    const handleGiveAccess = async (student: any) => {
        if (!folder) return;
        setAdding(a => ({ ...a, [student.userId]: true }));
        const res = await apiClient.folderAccessUpdate(folder.folderId, [student.userId]);
        setAdding(a => ({ ...a, [student.userId]: false }));
        if (!res.error) {
            setAddedIds(prev => new Set(prev).add(student.userId));
            // also refresh enrolled list
            setEnrolledStudents(prev => prev.some(s => s.userId === student.userId) ? prev : [...prev, student]);
        }
    };

    const handleOnboard = async (e: React.FormEvent) => {
        e.preventDefault();
        setOnboardLoading(true);
        setOnboardError('');
        setOnboardSuccess('');
        const res = await apiClient.onboardStudent({
            ...onboardForm,
            portalId: folder ? String(folder.portalId) : undefined,
        });
        if (res.error) { setOnboardError(res.error); setOnboardLoading(false); return; }
        // grant folder access to newly created student
        const newUserId = res.data?.userId;
        if (newUserId && folder) {
            await apiClient.folderAccessUpdate(folder.folderId, [newUserId]);
        }
        setOnboardLoading(false);
        setOnboardSuccess(`Student "${onboardForm.username}" created and added to folder!`);
        setOnboardForm({ username: '', email: '', password: '', fullName: '', course: '', specialization: '', year: '', semester: '', phone: '' });
        loadEnrolledStudents();
    };

    const handleAccessEmailAdd = async () => {
        if (!accessEmailInput) return;
        setAccessEmailLoading(true);
        setAccessEmailError('');
        const res = await apiClient.getUserByEmail(accessEmailInput);
        setAccessEmailLoading(false);
        if (res?.data) {
            const uid = Number(res.data);
            if (!accessUsers.some(u => u.userId === uid)) {
                setAccessUsers(prev => [...prev, { userId: uid, email: accessEmailInput }]);
            }
            setAccessEmailInput('');
        } else {
            setAccessEmailError(res.error || 'User not found');
        }
    };

    const handleAccessSubmit = async () => {
        if (!folder?.folderId || accessUsers.length === 0) return;
        setAccessLoading(true);
        setAccessError('');
        setAccessSuccess(false);
        const res = await apiClient.folderAccessUpdate(folder.folderId, accessUsers.map(u => u.userId));
        setAccessLoading(false);
        if (res.error) {
            setAccessError(res.error);
        } else {
            setAccessSuccess(true);
        }
    };

    const handleOpenFolder = (id: number) => {
        navigate(`/${portalName}/folder/${id}`);
    };

    const handleContentClick = (content: ContentItem) => {
        setSelectedContent(content);
        setShowContentModal(true);
    };

    const handleCloseContentModal = () => {
        setSelectedContent(null);
        setShowContentModal(false);
    };

    const renderContentModal = () => {
        if (!selectedContent) return null;

        switch (selectedContent.type.toUpperCase()) {
            case 'VIDEO':
                return (
                    <VideoPlayer
                        src={selectedContent.fileUrl || ''}
                        title={selectedContent.title}
                        description={selectedContent.description}
                        thumbnailUrl={selectedContent.mediaMetadata?.thumbnailUrl}
                        duration={selectedContent.mediaMetadata?.duration}
                        resolution={selectedContent.mediaMetadata?.resolution}
                    />
                );
            case 'AUDIO':
                return (
                    <AudioPlayer
                        src={selectedContent.fileUrl || ''}
                        title={selectedContent.title}
                        description={selectedContent.description}
                        duration={selectedContent.mediaMetadata?.duration}
                        mimeType={selectedContent.mediaMetadata?.mimeType}
                    />
                );
            case 'PDF':
                return (
                    <PDFViewer
                        src={selectedContent.fileUrl || ''}
                        title={selectedContent.title}
                        description={selectedContent.description}
                        pageCount={selectedContent.mediaMetadata?.pageCount}
                    />
                );
            case 'BLOG':
            case 'TEXT':
                return (
                    <BlogContent
                        title={selectedContent.title}
                        description={selectedContent.description}
                        textContent={selectedContent.textContent}
                        createdAt={selectedContent.createdAt}
                        updatedAt={selectedContent.updatedAt}
                    />
                );
            default:
                return (
                    <div className="unsupported-content">
                        <div className="unsupported-header">
                            <h3>{selectedContent.title}</h3>
                            {selectedContent.description && <p>{selectedContent.description}</p>}
                        </div>
                        <div className="unsupported-body">
                            <p>This content type is not supported yet.</p>
                            {selectedContent.fileUrl && (
                                <a 
                                    href={selectedContent.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="external-link"
                                >
                                    Open in new tab
                                </a>
                            )}
                        </div>
                    </div>
                );
        }
    };

    // create-folder handled via modal trigger button; route helper removed

    return (
        <div className="folder-details-page">
            <header className="folder-header">
                <div className="header-top">
                    <button className="btn-back" onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} /> Back
                    </button>
                    <div className="user-section">
                        <div className="user-info">
                            <span>{user?.username}</span>
                            {(isPortalAdmin || (user?.role && user.role !== 'user')) && (
                                <span className={`role-badge role-${isPortalAdmin ? 'admin' : user?.role}`}>
                                    {isPortalAdmin ? 'ADMIN' : user?.role?.toUpperCase()}
                                </span>
                            )}
                        </div>
                        <button className="btn-logout" onClick={logout}>Logout</button>
                    </div>
                </div>
                <div className="folder-title-row">
                    <h1>{folder?.name || 'Folder'}</h1>
                </div>
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading folder...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="btn-secondary">Retry</button>
                </div>
            ) : folder ? (
                <div className="folder-content">
                    {folder.description && <p className="folder-description">{folder.description}</p>}
                    {!loading && folder && canManage && (
                        <div className="action-flex-row">
                            {folder.canEdit && (
                                <>
                                    <button className="btn-action btn-content" onClick={() => setShowCreateContentModal(true)}>
                                        <Book size={17} /> Add Content
                                    </button>
                                    <button className="btn-action btn-folder" onClick={() => setShowCreateModal(true)}>
                                        <FolderPlus size={17} /> Create Subfolder
                                    </button>
                                </>
                            )}
                            <button
                                className="btn-action btn-onboard"
                                onClick={openManageModal}
                            >
                                <Users size={17} /> Manage Students
                            </button>
                            <button className="btn-action btn-access" onClick={() => { setShowAccessModal(true); setAccessSuccess(false); setAccessError(''); }}>
                                <Shield size={17} /> Manage Folder Admin
                            </button>
                            {!folder.isRoot && (user?.role === 'admin' || user?.role === 'super') && (
                                <button className="btn-action btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 size={17} /> Delete Folder
                                </button>
                            )}
                        </div>
                    )}

                    {/* Delete confirmation */}
                    {showDeleteConfirm && (
                        <div className="delete-confirm-bar">
                            <span>Delete <strong>{folder?.name}</strong>? This cannot be undone.</span>
                            <div className="confirm-actions">
                                <button className="btn-confirm-cancel" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}>Cancel</button>
                                <button className="btn-confirm-delete" onClick={handleDelete} disabled={deleteLoading}>
                                    {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                            {deleteError && <span className="delete-error">{deleteError}</span>}
                        </div>
                    )}
                    {showCreateModal && (
                        <CreateFolderModal
                            portalName={portalName || ''}
                            parentFolderId={folder?.folderId}
                            onClose={() => setShowCreateModal(false)}
                            onCreated={() => window.location.reload()}
                        />
                    )}
                    {showCreateContentModal && folder && (
                        <CreateContentModal
                            folderId={folder.folderId}
                            onClose={() => setShowCreateContentModal(false)}
                            onCreated={() => window.location.reload()}
                        />
                    )}
                    <h2>Subfolders</h2>
                    {folder.subFolders.length === 0 ? (
                        <p className="empty">No subfolders</p>
                    ) : (
                        <div className="folders-grid">
                            {folder.subFolders.map(sub => (
                                <div key={sub.folderId} className="folder-card" onClick={() => handleOpenFolder(sub.folderId)}>
                                    <Folder size={24} />
                                    <div>
                                        <h3>{sub.name}</h3>
                                        {sub.description && <p>{sub.description}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <h2>Contents</h2>
                    {folder.contents.length === 0 ? (
                        <p className="empty">No contents</p>
                    ) : (
                        <div className="contents-sections">
                            {(() => {
                                const videos = folder.contents.filter(c => c.type.toUpperCase() === 'VIDEO');
                                const audios = folder.contents.filter(c => c.type.toUpperCase() === 'AUDIO');
                                const pdfs = folder.contents.filter(c => c.type.toUpperCase() === 'PDF');
                                const blogs = folder.contents.filter(c => c.type.toUpperCase() === 'BLOG' || c.type.toUpperCase() === 'TEXT');
                                const others = folder.contents.filter(c => !['VIDEO', 'AUDIO', 'PDF', 'BLOG', 'TEXT'].includes(c.type.toUpperCase()));

                                return (
                                    <>
                                        {videos.length > 0 && (
                                            <div className="content-section">
                                                <h3 className="section-title">Videos ({videos.length})</h3>
                                                <div className="content-grid">
                                                    {videos.map(content => (
                                                        <ContentRenderer 
                                                            key={content.contentId} 
                                                            content={content} 
                                                            onClick={() => handleContentClick(content)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {audios.length > 0 && (
                                            <div className="content-section">
                                                <h3 className="section-title">Audio ({audios.length})</h3>
                                                <div className="content-grid">
                                                    {audios.map(content => (
                                                        <ContentRenderer 
                                                            key={content.contentId} 
                                                            content={content} 
                                                            onClick={() => handleContentClick(content)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {pdfs.length > 0 && (
                                            <div className="content-section">
                                                <h3 className="section-title">PDFs ({pdfs.length})</h3>
                                                <div className="content-grid">
                                                    {pdfs.map(content => (
                                                        <ContentRenderer 
                                                            key={content.contentId} 
                                                            content={content} 
                                                            onClick={() => handleContentClick(content)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {blogs.length > 0 && (
                                            <div className="content-section">
                                                <h3 className="section-title">Blogs ({blogs.length})</h3>
                                                <div className="content-grid">
                                                    {blogs.map(content => (
                                                        <ContentRenderer 
                                                            key={content.contentId} 
                                                            content={content} 
                                                            onClick={() => handleContentClick(content)}
                                                        />
                                                    ))}
                                    </div>
                                </div>
                                        )}
                                        
                                        {others.length > 0 && (
                                            <div className="content-section">
                                                <h3 className="section-title">Other Files ({others.length})</h3>
                                                <div className="content-grid">
                                                    {others.map(content => (
                                                        <ContentRenderer 
                                                            key={content.contentId} 
                                                            content={content} 
                                                            onClick={() => handleContentClick(content)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            ) : null}

            {/* Content Modal */}
            {showContentModal && selectedContent && (
                <div className="content-modal-overlay" onClick={handleCloseContentModal}>
                    <div className="content-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="content-modal-header">
                            <h2>{selectedContent.title}</h2>
                            <button className="close-btn" onClick={handleCloseContentModal}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="content-modal-body">
                            {renderContentModal()}
                        </div>
                    </div>
                </div>
            )}

            {showOnboardModal && (
                <div className="access-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeManageModal(); }}>
                    <div className="access-modal student-mgmt-modal">

                        {/* Header */}
                        <div className="access-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {modalMode === 'create' && (
                                    <button className="modal-close-btn" type="button"
                                        onClick={() => { setModalMode('list'); setOnboardError(''); setOnboardSuccess(''); }}>
                                        <ArrowLeft size={17} />
                                    </button>
                                )}
                                <div>
                                    <h3>{modalMode === 'list' ? 'Manage Students' : 'Create New Student'}</h3>
                                    <p className="access-modal-sub">
                                        {modalMode === 'list'
                                            ? <>Students with access to <strong>{folder?.name}</strong></>
                                            : <>Create & enroll into <strong>{folder?.name}</strong></>}
                                    </p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={closeManageModal}><X size={18} /></button>
                        </div>

                        {modalMode === 'list' ? (
                            <div className="access-modal-body student-list-body">

                                {/* ── Enrolled students ── */}
                                <div className="sm-section">
                                    <div className="sm-section-head">
                                        <span className="sm-section-title">
                                            <UserCheck size={14} /> Enrolled ({enrolledStudents.length})
                                        </span>
                                        <div className="sm-filter-wrap">
                                            <Search size={13} />
                                            <input
                                                placeholder="Filter by name or roll no…"
                                                value={studentFilter}
                                                onChange={e => setStudentFilter(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="sm-student-list">
                                        {enrolledLoading && <p className="sm-hint">Loading…</p>}
                                        {!enrolledLoading && enrolledStudents.length === 0 && (
                                            <p className="sm-hint">No students enrolled yet.</p>
                                        )}
                                        {!enrolledLoading && enrolledStudents
                                            .filter(s => {
                                                const q = studentFilter.toLowerCase();
                                                return !q || (s.username || '').toLowerCase().includes(q)
                                                    || (s.fullName || '').toLowerCase().includes(q);
                                            })
                                            .map(s => (
                                                <div key={s.userId} className="sm-student-row">
                                                    <div className="sm-avatar">{(s.fullName || s.username || '?')[0].toUpperCase()}</div>
                                                    <div className="sm-info">
                                                        <span className="sm-name">{s.fullName || s.username}</span>
                                                        <span className="sm-meta">
                                                            {s.username}{s.course ? ` · ${s.course}` : ''}{s.year ? ` · Yr ${s.year}` : ''}
                                                        </span>
                                                    </div>
                                                    <button
                                                        className="btn-revoke"
                                                        disabled={revoking[s.userId]}
                                                        onClick={() => handleRevoke(s)}
                                                    >
                                                        {revoking[s.userId] ? '…' : 'Revoke'}
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                <div className="sm-divider"><span>Add student</span></div>

                                {/* ── Search to add ── */}
                                <div className="sm-section">
                                    <div className="sm-add-search">
                                        <Search size={14} className="sm-search-icon" />
                                        <input
                                            placeholder="Search by roll no, name or email…"
                                            value={addQuery}
                                            onChange={e => handleAddSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="sm-add-results">
                                        {addSearchLoading && <p className="sm-hint">Searching…</p>}
                                        {!addSearchLoading && addQuery && addResults.length === 0 && (
                                            <p className="sm-hint">No students found.</p>
                                        )}
                                        {!addSearchLoading && !addQuery && (
                                            <p className="sm-hint">Type to search existing students.</p>
                                        )}
                                        {addResults.map(s => {
                                            const done = addedIds.has(s.userId) || enrolledStudents.some(e => e.userId === s.userId);
                                            return (
                                                <div key={s.userId} className="sm-student-row">
                                                    <div className="sm-avatar">{(s.fullName || s.username || '?')[0].toUpperCase()}</div>
                                                    <div className="sm-info">
                                                        <span className="sm-name">{s.fullName || s.username}</span>
                                                        <span className="sm-meta">{s.username}{s.course ? ` · ${s.course}` : ''}</span>
                                                    </div>
                                                    <button
                                                        className={`btn-give-access${done ? ' done' : ''}`}
                                                        disabled={done || adding[s.userId]}
                                                        onClick={() => handleGiveAccess(s)}
                                                    >
                                                        {done ? <><CheckCircle size={13} /> Added</> : adding[s.userId] ? '…' : 'Give Access'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="sm-create-new-wrap">
                                    <button className="btn-sm-create" onClick={() => { setModalMode('create'); setOnboardError(''); setOnboardSuccess(''); }}>
                                        <UserPlus size={15} /> Create New Student Account
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleOnboard}>
                                <div className="access-modal-body onboard-form">
                                    <div className="onboard-row">
                                        <div className="onboard-field">
                                            <label>Roll Number (Username) *</label>
                                            <input required value={onboardForm.username}
                                                onChange={e => setOnboardForm(p => ({ ...p, username: e.target.value }))}
                                                placeholder="e.g. 2024CS001" />
                                        </div>
                                        <div className="onboard-field">
                                            <label>Full Name</label>
                                            <input value={onboardForm.fullName}
                                                onChange={e => setOnboardForm(p => ({ ...p, fullName: e.target.value }))}
                                                placeholder="Student full name" />
                                        </div>
                                    </div>
                                    <div className="onboard-row">
                                        <div className="onboard-field">
                                            <label>Email *</label>
                                            <input type="email" required value={onboardForm.email}
                                                onChange={e => setOnboardForm(p => ({ ...p, email: e.target.value }))}
                                                placeholder="student@example.com" />
                                        </div>
                                        <div className="onboard-field">
                                            <label>Password *</label>
                                            <input type="password" required value={onboardForm.password}
                                                onChange={e => setOnboardForm(p => ({ ...p, password: e.target.value }))}
                                                placeholder="Minimum 6 characters" />
                                        </div>
                                    </div>
                                    <div className="onboard-row">
                                        <div className="onboard-field">
                                            <label>Course / Program</label>
                                            <input value={onboardForm.course}
                                                onChange={e => setOnboardForm(p => ({ ...p, course: e.target.value }))}
                                                placeholder="e.g. B.Tech, MBA" />
                                        </div>
                                        <div className="onboard-field">
                                            <label>Specialization / Branch</label>
                                            <input value={onboardForm.specialization}
                                                onChange={e => setOnboardForm(p => ({ ...p, specialization: e.target.value }))}
                                                placeholder="e.g. Computer Science" />
                                        </div>
                                    </div>
                                    <div className="onboard-row">
                                        <div className="onboard-field">
                                            <label>Year</label>
                                            <select value={onboardForm.year} onChange={e => setOnboardForm(p => ({ ...p, year: e.target.value }))}>
                                                <option value="">Select year</option>
                                                {['1','2','3','4','5'].map(y => <option key={y} value={y}>{y === '1' ? '1st' : y === '2' ? '2nd' : y === '3' ? '3rd' : `${y}th`} Year</option>)}
                                            </select>
                                        </div>
                                        <div className="onboard-field">
                                            <label>Semester</label>
                                            <select value={onboardForm.semester} onChange={e => setOnboardForm(p => ({ ...p, semester: e.target.value }))}>
                                                <option value="">Select semester</option>
                                                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={String(n)}>Sem {n}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="onboard-row">
                                        <div className="onboard-field">
                                            <label>Phone</label>
                                            <input type="tel" value={onboardForm.phone}
                                                onChange={e => setOnboardForm(p => ({ ...p, phone: e.target.value }))}
                                                placeholder="e.g. 9876543210" />
                                        </div>
                                    </div>

                                    {onboardError && <div className="onboard-msg onboard-error"><AlertCircle size={15} /> {onboardError}</div>}
                                    {onboardSuccess && <div className="onboard-msg onboard-success"><CheckCircle size={15} /> {onboardSuccess}</div>}
                                </div>

                                <div className="access-modal-footer">
                                    <button type="button" className="btn-access-cancel" onClick={closeManageModal}>Cancel</button>
                                    <button type="submit" className="btn-access-save" disabled={onboardLoading}>
                                        {onboardLoading ? 'Creating…' : 'Create & Add to Folder'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showAccessModal && (
                <div className="access-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAccessModal(false); }}>
                    <div className="access-modal">
                        <div className="access-modal-header">
                            <div>
                                <h3>Manage Folder Admin</h3>
                                <p className="access-modal-sub">Grant edit access to users for <strong>{folder?.name}</strong></p>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowAccessModal(false)}><X size={18} /></button>
                        </div>

                        <div className="access-modal-body">
                            {/* Email search */}
                            <div className="access-search-row">
                                <input
                                    type="email"
                                    className="access-email-input"
                                    placeholder="Add user by email..."
                                    value={accessEmailInput}
                                    onChange={e => { setAccessEmailInput(e.target.value); setAccessEmailError(''); }}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAccessEmailAdd(); } }}
                                    disabled={accessEmailLoading}
                                />
                                <button
                                    className="btn-add-user"
                                    onClick={handleAccessEmailAdd}
                                    disabled={accessEmailLoading || !accessEmailInput}
                                >
                                    {accessEmailLoading ? '...' : '+ Add'}
                                </button>
                            </div>
                            {accessEmailError && <p className="access-field-error">{accessEmailError}</p>}

                            {/* Users list */}
                            {accessUsers.length > 0 ? (
                                <div className="access-users-list">
                                    <p className="access-list-label">Users to grant access ({accessUsers.length})</p>
                                    {accessUsers.map(({ userId, email }) => (
                                        <div key={userId} className="access-user-row">
                                            <div className="access-user-avatar">{email[0].toUpperCase()}</div>
                                            <span className="access-user-email">{email}</span>
                                            <button
                                                className="access-user-remove"
                                                onClick={() => setAccessUsers(prev => prev.filter(u => u.userId !== userId))}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="access-empty">
                                    <UserCheck size={32} />
                                    <p>Add users above to grant them edit access</p>
                                </div>
                            )}

                            {accessSuccess && <div className="access-success">Access updated successfully!</div>}
                            {accessError && <div className="access-error-msg">{accessError}</div>}
                        </div>

                        <div className="access-modal-footer">
                            <button className="btn-access-cancel" onClick={() => setShowAccessModal(false)}>Cancel</button>
                            <button
                                className="btn-access-save"
                                onClick={handleAccessSubmit}
                                disabled={accessUsers.length === 0 || accessLoading}
                            >
                                {accessLoading ? 'Saving...' : `Save Access (${accessUsers.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderDetailsPage;
