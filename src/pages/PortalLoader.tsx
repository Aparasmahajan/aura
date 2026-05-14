import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { usePortal } from '../contexts/PortalContext';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import './PortalLoader.scss';

const PORTAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const PortalLoader: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const navigate = useNavigate();
  const { setPortal, clearPortalData } = usePortal();
  const { isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (portalName && portalName !== 'admn') {
      loadPortal();
    }

    return () => {
      fetchingRef.current = false;
      clearPortalData();
    };
  }, [portalName]);

  const applyPortalData = (apiPortal: any) => {
    const mapped = {
      id: String(apiPortal.portalId ?? apiPortal.id),
      name: apiPortal.portalName ?? apiPortal.name,
      display_name: apiPortal.portalName ?? apiPortal.display_name ?? apiPortal.name,
      description: apiPortal.description ?? '',
      logo_url: apiPortal.logoUrl ?? apiPortal.logo_url ?? '',
      banner_url: apiPortal.bannerUrl ?? apiPortal.banner_url ?? '',
      is_active: apiPortal.isActive ?? apiPortal.is_active ?? true,
    } as const;

    const adminIds: string[] = Array.isArray(apiPortal.admins)
      ? apiPortal.admins.map((admin: any) => String(admin.userId ?? admin.id))
      : [];

    setPortal(mapped);
    sessionStorage.setItem('portal_admin_ids', JSON.stringify(adminIds));
    return mapped;
  };

  const loadPortal = async () => {
    if (!portalName || fetchingRef.current) return;

    // Serve from cache immediately — eliminates the spinner on repeat visits
    const cacheKey = `portal_cache_${portalName}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { apiPortal, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < PORTAL_CACHE_TTL) {
          applyPortalData(apiPortal);
          setIsLoading(false);
          return;
        }
      } catch {
        sessionStorage.removeItem(cacheKey);
      }
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError('');

    const response = await apiClient.getPortalInfo(portalName);
    fetchingRef.current = false;

    if (response.error) {
      setError(response.error);
      setIsLoading(false);
      return;
    }

    if (response.data) {
      const apiPortal = response.data?.data ?? response.data;
      applyPortalData(apiPortal);
      sessionStorage.setItem(cacheKey, JSON.stringify({ apiPortal, timestamp: Date.now() }));
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
