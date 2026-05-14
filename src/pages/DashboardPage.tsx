import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import { apiClient } from '../utils/api';
import { Folder, FolderPlus, LogOut, User, Shield } from 'lucide-react';
import './DashboardPage.scss';

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

  const canCreateFolders = user?.role === 'super' || isPortalAdmin ;
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
              {(isPortalAdmin || (user?.role && user.role !== 'user')) && (
                <span className={`role-badge role-${isPortalAdmin ? 'admin' : user?.role}`}>
                  {isPortalAdmin ? 'ADMIN' : user?.role?.toUpperCase()}
                </span>
              )}
            </div>
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
