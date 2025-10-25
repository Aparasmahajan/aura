import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, FolderPlus, Book, X, UserCheck } from 'lucide-react';
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
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchedUsers, setSearchedUsers] = useState<{ userId: number; email: string }[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [accessLoading, setAccessLoading] = useState(false);
    const [accessError, setAccessError] = useState('');
    const [accessSuccess, setAccessSuccess] = useState(false);

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
                            {user?.role && (
                                <span className={`role-badge role-${user.role}`}>{user.role}</span>
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
                    {!loading && folder && folder.canEdit && (
                        <div className="action-flex-row">
                            <button className="btn-primary create-content-btn" onClick={() => setShowCreateContentModal(true)}>
                                <Book size={20} />Add Content
                            </button>
                            <button className="btn-primary create-folder-btn" onClick={() => setShowCreateModal(true)}>
                                <FolderPlus size={20} /> Create Folder
                            </button>
                            <button className="btn-primary access-update-btn auto-margin-desktop" onClick={() => setShowAccessModal(true)}>
                                <UserCheck size={20} style={{ marginRight: 6 }} />Access Update
                            </button>
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
                <div className="content-modal-overlay" onClick={() => setShowAccessModal(false)}>
                    <div className="content-modal" style={{ minWidth: 360, maxWidth: 480, position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <div className="content-modal-header">
                            <h2>Update Folder Access</h2>
                            <button className="close-btn" onClick={() => setShowAccessModal(false)}><X size={24} /></button>
                        </div>
                        <div className="content-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <label htmlFor="search-email">Search User by Email:</label>
                            <form style={{ display: 'flex', gap: 8 }} onSubmit={async e => {
                                e.preventDefault();
                                setAccessError(''); setAccessSuccess(false);
                                setAccessLoading(true);
                                try {
                                    const res = await apiClient.getUserByEmail(searchEmail);
                                    const userIdNum = Number(res.data);
                                    if (userIdNum && !isNaN(userIdNum)) {
                                        setSearchedUsers(prev => {
                                            if (prev.some(u => u.userId === userIdNum)) return prev;
                                            return [...prev, { userId: userIdNum, email: searchEmail }];
                                        });
                                    } else {
                                        setAccessError(res.error || 'User not found');
                                    }
                                } finally { setAccessLoading(false); }
                            }}>
                                <input id="search-email" value={searchEmail} onChange={e => setSearchEmail(e.target.value)} type="email" required placeholder="user@example.com" className="input" style={{ flex: 1 }} />
                                <button type="submit" disabled={accessLoading} className="btn-primary">Search</button>
                            </form>
                            <div>
                                <div style={{ margin: '10px 0', fontWeight: 500 }}>Searched Users:</div>
                                <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                                    {searchedUsers.map(({ userId, email }) => (
                                        <li key={userId} style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input type="checkbox" checked={selectedUserIds.includes(userId)} id={`sel-user-${userId}`} onChange={e => {
                                                setSelectedUserIds(ids => e.target.checked ? [...ids, userId] : ids.filter(id => id !== userId));
                                            }} />
                                            <label htmlFor={`sel-user-${userId}`}>{email} <span style={{ marginLeft: 8, color: '#6B7280' }}>[{userId}]</span></label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <button className="btn-primary" disabled={selectedUserIds.length === 0 || accessLoading} onClick={async () => {
                                if (!folder?.folderId) {
                                  setAccessError('Missing folder ID.');
                                  setAccessLoading(false);
                                  return;
                                }
                                setAccessLoading(true);
                                setAccessError('');
                                setAccessSuccess(false);
                                try {
                                    const result = await apiClient.folderAccessUpdate(folder.folderId, selectedUserIds);
                                    if (result.error) {
                                        setAccessError(result.error || 'Failed to update access.');
                                    } else {
                                        setAccessSuccess(true);
                                    }
                                } catch {
                                    setAccessError('Could not update access.');
                                } finally {
                                    setAccessLoading(false);
                                }
                            }}>Update Access</button>
                            {accessLoading && <div>Updating...</div>}
                            {accessSuccess && <div style={{ color: 'green' }}>Access updated successfully!</div>}
                            {accessError && <div style={{ color: 'red' }}>{accessError}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderDetailsPage;
