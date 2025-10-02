export const DEFAULT_PORTALS = [
  {
    name: 'demo',
    display_name: 'Demo Portal',
    description: 'A demonstration portal for testing',
    logo_url: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner_url: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=1200'
  },
  {
    name: 'company',
    display_name: 'Company Portal',
    description: 'Internal company portal for employees',
    logo_url: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=200',
    banner_url: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1200'
  }
];

export const DEFAULT_USERS = [
  {
    username: 'superadmin',
    email: 'super@example.com',
    password: 'password123',
    role: 'super'
  },
  {
    username: 'admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  },
  {
    username: 'user',
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  }
];

export const API_ENDPOINTS = {
  LOGIN: '/auth-login',
  SIGNUP: '/auth-signup',
  GET_PORTAL_INFO: '/portal-api/getPortalInfo',
  GET_PORTAL_FOLDERS: '/portal-api/getPortalFolders'
};
