import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortal } from '../contexts/PortalContext';
import './SignupPage.scss';

const SignupPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { portal } = usePortal();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const result = await signup(formData.username, formData.email, formData.password);

    if (!result.success) {
      setError(result.error || 'Signup failed');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    navigate(`/${portalName}/dashboard`);
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-header">
          {portal?.logo_url && (
            <img src={portal.logo_url} alt={portal.display_name} className="portal-logo" />
          )}
          <h1>Create Account</h1>
          <p className="subtitle">Join {portal?.display_name || 'Portal'}</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Create a password"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="login-link">
            Already have an account?{' '}
            <span onClick={() => navigate(`/${portalName}/login`)} className="link">
              Sign in
            </span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
