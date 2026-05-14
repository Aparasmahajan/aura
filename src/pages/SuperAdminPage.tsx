import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { LogOut, User, Shield, RefreshCw, ChevronDown, ChevronUp, Lock, PlusCircle, UserPlus } from 'lucide-react';
import './SuperAdminPage.scss';

interface AdminSummary {
  userId: number;
  username: string;
  fullName: string | null;
  email: string;
  isActive: boolean;
}

interface PortalItem {
  portalId: number;
  portalName: string;
  isActive: boolean;
  admins: AdminSummary[];
}

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, login, isLoading: authLoading } = useAuth();

  const [portals, setPortals] = useState<PortalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPortal, setExpandedPortal] = useState<number | null>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Create portal modal state
  const [showCreatePortal, setShowCreatePortal] = useState(false);
  const [createPortalName, setCreatePortalName] = useState('');
  const [createAdminEmail, setCreateAdminEmail] = useState('');
  const [createAdminUserId, setCreateAdminUserId] = useState<number | null>(null);
  const [createAdminLookupLoading, setCreateAdminLookupLoading] = useState(false);
  const [createAdminLookupError, setCreateAdminLookupError] = useState('');
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Create user modal state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  // Change admin modal state
  const [changeModalPortal, setChangeModalPortal] = useState<PortalItem | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [lookupUserId, setLookupUserId] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'super') return;
    loadPortals();
  }, [user, authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const result = await login(loginUsername, loginPassword);
    if (!result.success) {
      setLoginError(result.error || 'Login failed');
    }
    setLoginLoading(false);
  };

  const loadPortals = async () => {
    setIsLoading(true);
    setError('');
    const res = await apiClient.getAdminPortals();
    if (res.error) {
      setError(res.error);
    } else {
      const list = res.data?.data ?? res.data ?? [];
      setPortals(Array.isArray(list) ? list : []);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const openChangeModal = (portal: PortalItem) => {
    setChangeModalPortal(portal);
    setEmailInput('');
    setLookupUserId(null);
    setLookupError('');
    setSubmitError('');
    setSubmitSuccess('');
  };

  const closeChangeModal = () => {
    setChangeModalPortal(null);
  };

  const handleEmailBlur = async () => {
    if (!emailInput) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupUserId(null);
    const res = await apiClient.getUserByEmail(emailInput);
    if (res.error || !res.data) {
      setLookupError('User not found');
    } else {
      setLookupUserId(res.data);
    }
    setLookupLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserLoading(true);
    setCreateUserError('');
    setCreateUserSuccess('');
    const res = await apiClient.createUser({ username: newUsername, email: newEmail, password: newPassword, fullName: newFullName });
    if (res.error) {
      setCreateUserError(res.error);
    } else {
      setCreateUserSuccess(`User "${newUsername}" created. You can now use ${newEmail} when creating a portal.`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
    }
    setCreateUserLoading(false);
  };

  const handleCreateAdminEmailBlur = async () => {
    if (!createAdminEmail) return;
    setCreateAdminLookupLoading(true);
    setCreateAdminLookupError('');
    setCreateAdminUserId(null);
    const res = await apiClient.getUserByEmail(createAdminEmail);
    if (res.error || !res.data) {
      setCreateAdminLookupError('User not found');
    } else {
      setCreateAdminUserId(res.data);
    }
    setCreateAdminLookupLoading(false);
  };

  const handleCreatePortal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAdminUserId || !user?.id) return;
    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');
    const res = await apiClient.createPortal({
      portalName: createPortalName,
      adminId: createAdminUserId,
      isActive: createIsActive,
      createrId: Number(user.id),
    });
    if (res.error) {
      setCreateError(res.error);
    } else {
      setCreateSuccess('Portal created successfully!');
      await loadPortals();
      setTimeout(() => {
        setShowCreatePortal(false);
        setCreatePortalName('');
        setCreateAdminEmail('');
        setCreateAdminUserId(null);
        setCreateIsActive(true);
        setCreateSuccess('');
      }, 1200);
    }
    setCreateLoading(false);
  };

  const handleSetAdmin = async () => {
    if (!changeModalPortal || lookupUserId === null) return;
    setSubmitLoading(true);
    setSubmitError('');
    setSubmitSuccess('');
    const res = await apiClient.setPortalAdmin(changeModalPortal.portalId, lookupUserId);
    if (res.error) {
      setSubmitError(res.error);
    } else {
      setSubmitSuccess('Admin updated successfully');
      await loadPortals();
      setTimeout(() => closeChangeModal(), 1200);
    }
    setSubmitLoading(false);
  };

  if (authLoading) {
    return (
      <div className="super-admin-page">
        <div className="admin-main">
          <div className="state-box"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'super') {
    return (
      <div className="admin-login-screen">
        <div className="admin-login-card">
          <div className="admin-login-icon"><Lock size={32} /></div>
          <h2>Super Admin</h2>
          <p>Sign in with your super admin credentials</p>
          <form onSubmit={handleLogin}>
            {loginError && <div className="login-error">{loginError}</div>}
            {user && user.role !== 'super' && (
              <div className="login-error">This account does not have super admin access.</div>
            )}
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={e => setLoginUsername(e.target.value)}
              required
              disabled={loginLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              required
              disabled={loginLoading}
            />
            <button type="submit" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="super-admin-page">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <Shield size={28} />
            <div>
              <h1>Super Admin Panel</h1>
              <p>Manage portals and their administrators</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <User size={18} />
              <span>{user?.username}</span>
              <span className="role-badge">SUPER</span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="section-header">
          <h2>All Portals</h2>
          <div className="section-actions">
            <button className="btn-create-user" onClick={() => { setShowCreateUser(true); setCreateUserError(''); setCreateUserSuccess(''); }}>
              <UserPlus size={16} />
              Create User
            </button>
            <button className="btn-create-portal" onClick={() => setShowCreatePortal(true)}>
              <PlusCircle size={16} />
              Create Portal
            </button>
            <button className="btn-refresh" onClick={loadPortals} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="state-box">
            <div className="spinner" />
            <p>Loading portals...</p>
          </div>
        ) : error ? (
          <div className="state-box error">
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadPortals}>Retry</button>
          </div>
        ) : portals.length === 0 ? (
          <div className="state-box">
            <p>No portals found.</p>
          </div>
        ) : (
          <div className="portals-list">
            {portals.map(portal => (
              <div key={portal.portalId} className="portal-card">
                <div
                  className="portal-card-header"
                  onClick={() =>
                    setExpandedPortal(expandedPortal === portal.portalId ? null : portal.portalId)
                  }
                >
                  <div className="portal-info">
                    <span className="portal-name">{portal.portalName}</span>
                    <span className={`status-badge ${portal.isActive ? 'active' : 'inactive'}`}>
                      {portal.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="admin-count">{portal.admins.length} admin{portal.admins.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="portal-actions">
                    <button
                      className="btn-change-admin"
                      onClick={e => { e.stopPropagation(); openChangeModal(portal); }}
                    >
                      Change Admin
                    </button>
                    {expandedPortal === portal.portalId ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedPortal === portal.portalId && (
                  <div className="portal-admins">
                    {portal.admins.length === 0 ? (
                      <p className="no-admins">No admins assigned</p>
                    ) : (
                      <table className="admins-table">
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portal.admins.map(admin => (
                            <tr key={admin.userId}>
                              <td><span className="username-cell">{admin.username}</span></td>
                              <td>{admin.fullName || '—'}</td>
                              <td>{admin.email}</td>
                              <td>
                                <span className={`status-badge small ${admin.isActive ? 'active' : 'inactive'}`}>
                                  {admin.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create User</h3>
            <p className="modal-subtitle">Create an account for a future portal admin</p>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="e.g. john_doe"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                  disabled={createUserLoading}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                  disabled={createUserLoading}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  disabled={createUserLoading}
                />
              </div>
              <div className="form-group">
                <label>Full Name <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  disabled={createUserLoading}
                />
              </div>

              {createUserError && <div className="error-message">{createUserError}</div>}
              {createUserSuccess && <div className="success-message">{createUserSuccess}</div>}

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={createUserLoading}>
                  {createUserLoading ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateUser(false)}>
                  {createUserSuccess ? 'Close' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreatePortal && (
        <div className="modal-overlay" onClick={() => setShowCreatePortal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Portal</h3>
            <form onSubmit={handleCreatePortal}>
              <div className="form-group">
                <label>Portal Name</label>
                <input
                  type="text"
                  placeholder="e.g. my-portal"
                  value={createPortalName}
                  onChange={e => setCreatePortalName(e.target.value)}
                  required
                  disabled={createLoading}
                />
              </div>

              <div className="form-group">
                <label>Admin Email</label>
                <div className="input-row">
                  <input
                    type="email"
                    placeholder="Enter admin's email"
                    value={createAdminEmail}
                    onChange={e => {
                      setCreateAdminEmail(e.target.value);
                      setCreateAdminUserId(null);
                      setCreateAdminLookupError('');
                    }}
                    onBlur={handleCreateAdminEmailBlur}
                    disabled={createAdminLookupLoading || createLoading}
                    required
                  />
                  {createAdminLookupLoading && <span className="inline-spinner" />}
                </div>
                {createAdminLookupError && <span className="field-error">{createAdminLookupError}</span>}
                {createAdminUserId !== null && !createAdminLookupError && (
                  <span className="field-success">User found </span>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createIsActive}
                    onChange={e => setCreateIsActive(e.target.checked)}
                    disabled={createLoading}
                  />
                  Active
                </label>
              </div>

              {createError && <div className="error-message">{createError}</div>}
              {createSuccess && <div className="success-message">{createSuccess}</div>}

              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!createAdminUserId || createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create Portal'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreatePortal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {changeModalPortal && (
        <div className="modal-overlay" onClick={closeChangeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Change Admin</h3>
            <p className="modal-subtitle">
              Portal: <strong>{changeModalPortal.portalName}</strong>
            </p>
            <div className="form-group">
              <label>New Admin Email</label>
              <div className="input-row">
                <input
                  type="email"
                  placeholder="Enter user email"
                  value={emailInput}
                  onChange={e => {
                    setEmailInput(e.target.value);
                    setLookupUserId(null);
                    setLookupError('');
                  }}
                  onBlur={handleEmailBlur}
                  disabled={lookupLoading}
                />
                {lookupLoading && <span className="inline-spinner" />}
              </div>
              {lookupError && <span className="field-error">{lookupError}</span>}
              {lookupUserId !== null && !lookupError && (
                <span className="field-success">User found</span>
              )}
            </div>

            {submitError && <div className="error-message">{submitError}</div>}
            {submitSuccess && <div className="success-message">{submitSuccess}</div>}

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleSetAdmin}
                disabled={lookupUserId === null || submitLoading}
              >
                {submitLoading ? 'Saving...' : 'Set as Admin'}
              </button>
              <button className="btn-secondary" onClick={closeChangeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
