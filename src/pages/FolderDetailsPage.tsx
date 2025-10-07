import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, FileVideo, FileText, ArrowLeft, FolderPlus, SwatchBook, Book } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import CreateFolderModal from '../pages/CreateFolderModal';
import CreateContentModal from '../pages/CreateContentModal';

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

interface ContentItem {
    contentId: number;
    type: string;
    title: string;
    description?: string;
    fileUrl?: string;
    textContent?: string;
    sizeInBytes?: number;
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

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/${portalName}/login`);
            return;
        }
        loadFolder();
    }, [folderId, isAuthenticated]);

    const loadFolder = async () => {
        if (!folderId) return;
        setLoading(true);
        setError('');
        try {
            const res = await apiClient.getFolderDetails(Number(folderId));
            if (res.error) {
                setError(res.error);
            } else {
                setFolder(res?.data?.data);
            }
        } catch {
            setError('Failed to load folder details');
        }
        setLoading(false);
    };

    const handleOpenFolder = (id: number) => {
        navigate(`/${portalName}/folder/${id}`);
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
                    <button onClick={loadFolder} className="btn-secondary">Retry</button>
                </div>
            ) : folder ? (
                <div className="folder-content">
                    {folder.description && <p className="folder-description">{folder.description}</p>}
                    {!loading && folder && folder.canEdit && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button className="btn-primary create-content-btn" onClick={() => setShowCreateContentModal(true)}>
                                <Book size={20} />+ Add Content
                            </button>
                            <button className="btn-primary create-folder-btn" onClick={() => setShowCreateModal(true)}>
                                <FolderPlus size={20} /> Create Folder
                            </button>
                            
                        </div>
                    )}
                    {showCreateModal && (
                        <CreateFolderModal
                            portalName={portalName || ''}
                            parentFolderId={folder?.folderId}
                            onClose={() => setShowCreateModal(false)}
                            onCreated={loadFolder}
                        />
                    )}
                    {showCreateContentModal && folder && (
                        <CreateContentModal
                            folderId={folder.folderId}
                            onClose={() => setShowCreateContentModal(false)}
                            onCreated={loadFolder}
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
                        <div className="contents-grid">
                            {folder.contents.map(content => (
                                <div key={content.contentId} className="content-card">
                                    {content.type === 'VIDEO' ? <FileVideo size={22} /> : <FileText size={22} />}
                                    <div>
                                        <h3>{content.title}</h3>
                                        {content.description && <p>{content.description}</p>}
                                        {content.fileUrl && (
                                            <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                                                Open File
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
};

export default FolderDetailsPage;
