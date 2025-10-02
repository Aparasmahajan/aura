import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import { apiClient } from '../utils/api';
import { Folder, FolderPlus, LogOut, User } from 'lucide-react';
import './DashboardPage.scss';

const DashboardPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { portal, folders, setFolders, userRole, setUserRole, isPortalAdmin, setIsPortalAdmin } = usePortal();
  const [emails, setEmails] = useState<
    { email: string; userId: number | null; loading: boolean; error?: string }[]
  >([{ email: '', userId: null, loading: false }]);



  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    isUniversal: false,
    price: '',
    accessDurationInDays: '',
    parentFolderId: '', // for root, leave blank
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

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

    loadFolders();
  }, [isAuthenticated, portal]);

  useEffect(() => {
    if (!user) return;

    // Get portal admins from sessionStorage
    const portalAdmins: string[] = JSON.parse(sessionStorage.getItem('portal_admins') || '[]');

    // Check if current user is in the admins list
    console.log("user names are ", user.username);

    const isAdmin = portalAdmins.includes(user.username);
    setIsPortalAdmin(isAdmin);

    console.log("isAdmin ", isAdmin);
  }, [user]);

  const loadFolders = async () => {
    if (!portal) return;

    setIsLoading(true);
    setError('');

    const response = await apiClient.getPortalFolders(portal.id);

    if (response.error) {
      setError(response.error);
      setIsLoading(false);
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

    setIsLoading(false);
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
      description: createForm.description,
      isUniversal: createForm.isUniversal,
      price: createForm.price ? parseFloat(createForm.price) : undefined,
      accessDurationInDays: createForm.accessDurationInDays ? parseInt(createForm.accessDurationInDays) : undefined,
      parentFolderId: createForm.parentFolderId ? parseInt(createForm.parentFolderId) : undefined,
      userIds,
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

  const isFolderAdmin = getRootFolders().some(f => f.canEdit);
  const canCreateFolders = user?.role === 'super' || isPortalAdmin || isFolderAdmin;
  console.log("canCreateFolders ", canCreateFolders);

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
              <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
            </div>
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
                  <div className="modal-overlay">
                    <div className="modal">
                      <h3>Create Folder</h3>
                      <form onSubmit={handleCreateFolder}>
                        <input
                          type="text"
                          placeholder="Name"
                          value={createForm.name}
                          onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                          required
                        />
                        <textarea
                          placeholder="Description"
                          value={createForm.description}
                          onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                        />
                        <label>
                          <input
                            type="checkbox"
                            checked={createForm.isUniversal}
                            onChange={e => setCreateForm(f => ({ ...f, isUniversal: e.target.checked }))}
                          /> Universal
                        </label>
                        <input
                          type="number"
                          placeholder="Price"
                          value={createForm.price}
                          onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
                        />
                        <input
                          type="number"
                          placeholder="Access Duration (days)"
                          value={createForm.accessDurationInDays}
                          onChange={e => setCreateForm(f => ({ ...f, accessDurationInDays: e.target.value }))}
                        />

                        {/* Email Inputs */}
                        <div className="emails-inputs">
                          {emails.map((item, index) => (
                            <div key={index} className="email-row">
                              <input
                                type="email"
                                placeholder="User Email"
                                value={item.email}
                                onChange={e => {
                                  const newEmails = [...emails];
                                  newEmails[index].email = e.target.value;
                                  newEmails[index].userId = null; // reset userId if changed
                                  newEmails[index].error = ''; // reset previous error
                                  setEmails(newEmails);
                                }}
                                onBlur={async () => {
                                  if (!item.email || item.userId || item.loading) return; // skip if empty or already fetched

                                  const newEmails = [...emails];
                                  newEmails[index].loading = true;
                                  setEmails(newEmails);

                                  try {
                                    const res = await apiClient.getUserByEmail(item.email);
                                    newEmails[index].loading = false;

                                    if (res?.data) {
                                      // Only SUCCESS is valid
                                      newEmails[index].userId = res.data;
                                      newEmails[index].error = '';
                                    } else {
                                      newEmails[index].userId = null;
                                      newEmails[index].error = 'User does not exist';
                                    }
                                  } catch (err) {
                                    newEmails[index].loading = false;
                                    newEmails[index].userId = null;
                                    newEmails[index].error = 'User does not exist';
                                  }

                                  setEmails(newEmails);
                                }}
                                disabled={item.userId !== null} // read-only after success
                                required
                              />
                              {item.loading && <span className="loading-spinner">⏳</span>}
                              {item.error && <span className="error-message">{item.error}</span>}

                              {/* Remove button */}
                              {emails.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setEmails(emails.filter((_, i) => i !== index))}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add another email button only if last email has no error */}
                          {emails[emails.length - 1]?.error === '' && (
                            <button
                              type="button"
                              onClick={() =>
                                setEmails([...emails, { email: '', userId: null, loading: false }])
                              }
                            >
                              Add Another Email
                            </button>
                          )}
                        </div>



                        <button type="submit" className="btn-primary" disabled={createLoading}>
                          {createLoading ? 'Creating...' : 'Create'}
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                          Cancel
                        </button>
                        {createError && <div className="error-message">{createError}</div>}
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

  return (
    <div className="folder-card">
      <div
        className="folder-header"
        onClick={() => {
          if (!canOpen) return;
          setIsExpanded(!isExpanded);
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
            <div key={subfolder.id} className="subfolder-item">
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
