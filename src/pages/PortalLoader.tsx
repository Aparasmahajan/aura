import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { usePortal } from '../contexts/PortalContext';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import './PortalLoader.scss';

const PortalLoader: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { setPortal, clearPortalData } = usePortal();
  const { isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (portalName) {
      loadPortal();
    }

    return () => {
      clearPortalData();
    };
  }, [portalName]);

  const loadPortal = async () => {
  if (!portalName) return;

  setIsLoading(true);
  setError('');

  const response = await apiClient.getPortalInfo(portalName);

  if (response.error) {
    setError(response.error);
    setIsLoading(false);
    return;
  }

  if (response.data) {
    const apiPortal = response.data?.data ?? response.data;

    // Map portal data for context
    const mapped = {
      id: String(apiPortal.portalId ?? apiPortal.id),
      name: apiPortal.portalName ?? apiPortal.name,
      display_name: apiPortal.portalName ?? apiPortal.display_name ?? apiPortal.name,
      description: apiPortal.description ?? '',
      logo_url: apiPortal.logoUrl ?? apiPortal.logo_url ?? '',
      banner_url: apiPortal.bannerUrl ?? apiPortal.banner_url ?? '',
      is_active: apiPortal.isActive ?? apiPortal.is_active ?? true,
    } as const;

    setPortal(mapped);

    // Store admin usernames in sessionStorage
    const adminUsernames: string[] = Array.isArray(apiPortal.admins)
      ? apiPortal.admins.map((admin: any) =>
          typeof admin === 'string' ? admin : admin.username
        )
      : [];
    sessionStorage.setItem('portal_admins', JSON.stringify(adminUsernames));

    setIsLoading(false);

    if (!isAuthenticated && window.location.pathname === `/${portalName}`) {
      navigate(`/${portalName}/login`);
    }
  }
};


  if (isLoading) {
    return (
      <div className="portal-loader">
        <div className="loader-content">
          <div className="spinner-large"></div>
          <p>Loading portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-loader">
        <div className="error-content">
          <h2>Portal Not Found</h2>
          <p>{error}</p>
          <button onClick={loadPortal} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default PortalLoader;
