import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, FolderPlus, Book, X, UserCheck, Trash2, Shield } from 'lucide-react';
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
                            <button className="btn-action btn-access" onClick={() => { setShowAccessModal(true); setAccessSuccess(false); setAccessError(''); }}>
                                <Shield size={17} /> Manage Folder Admin
                            </button>
                            <button className="btn-action btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                                <Trash2 size={17} /> Delete Folder
                            </button>
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
