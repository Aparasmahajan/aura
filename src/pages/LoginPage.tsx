import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import './LoginPage.scss';

const LoginPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { portal } = usePortal();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.message === 'Username not found') {
      navigate(`/${portalName}/signup`);
      return;
    }

    if (!result.success) {
      setError(result.error || 'Login failed');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    navigate(`/${portalName}/dashboard`);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          {portal?.logo_url && (
            <img src={portal.logo_url} alt={portal.display_name} className="portal-logo" />
          )}
          <h1>{portal?.display_name || 'Portal'}</h1>
          <p className="subtitle">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="signup-link">
            Don't have an account?{' '}
            <span onClick={() => navigate(`/${portalName}/signup`)} className="link">
              Sign up
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
