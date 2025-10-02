import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Portal {
  id: string;
  name: string;
  display_name: string;
  description: string;
  logo_url: string;
  banner_url: string;
  is_active: boolean;
}

export interface Folder {
  id: string;
  portal_id: string;
  parent_id: string | null;
  name: string;
  description: string;
  isUniversal?: boolean;
  canEdit: boolean;
  canView: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PortalContextType {
  portal: Portal | null;
  folders: Folder[];
  userRole: string | null;
  isPortalAdmin: boolean;
  setPortal: (portal: Portal | null) => void;
  setFolders: (folders: Folder[]) => void;
  setUserRole: (role: string | null) => void;
  setIsPortalAdmin: (isAdmin: boolean) => void;
  clearPortalData: () => void;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isPortalAdmin, setIsPortalAdmin] = useState(false);

  const clearPortalData = () => {
    setPortal(null);
    setFolders([]);
    setUserRole(null);
    setIsPortalAdmin(false);
  };

  return (
    <PortalContext.Provider
      value={{
        portal,
        folders,
        userRole,
        isPortalAdmin,
        setPortal,
        setFolders,
        setUserRole,
        setIsPortalAdmin,
        clearPortalData
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
