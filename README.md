# Multi-Portal Application

A dynamic, multi-portal React application with authentication, role-based access control, and folder management capabilities.

## Features

- **Dynamic Portal Routing**: Access different portals via context path (e.g., `/portalName`)
- **Authentication**: JWT-based session management with login/signup flows
- **Role-Based Access Control**: Three roles (super, admin, user) with different permissions
- **Folder Management**: Dynamic folder structure with granular permissions
- **Responsive Design**: Modern UI with SCSS styling

## Architecture

### Folder Structure

```
src/
├── contexts/           # React Context providers
│   ├── AuthContext.tsx    # Authentication state management
│   └── PortalContext.tsx  # Portal and folder state management
├── pages/              # Page components
│   ├── HomePage.tsx       # Landing page
│   ├── LoginPage.tsx      # User login
│   ├── SignupPage.tsx     # User registration
│   ├── DashboardPage.tsx  # Portal dashboard with folders
│   └── PortalLoader.tsx   # Portal info loader
├── utils/              # Utility functions
│   └── api.ts            # API client with JWT management
├── constants/          # Static data
│   └── portalData.ts     # Portal configurations
└── App.tsx            # Main routing component
```

### Database Schema

The application uses Supabase with the following tables:

- **portals**: Portal information and configuration
- **users**: User accounts with role-based permissions
- **portal_admins**: Junction table for portal administrators
- **folders**: Folder hierarchy with portal association
- **folder_permissions**: User permissions for specific folders

### API Endpoints

All endpoints are implemented as Supabase Edge Functions:

#### Authentication

- `POST /auth-login`: User login
  - Request: `{ username, password }`
  - Response: `{ token, user }` or `{ message: "Username not found" }`

- `POST /auth-signup`: User registration
  - Request: `{ username, email, password }`
  - Response: `{ token, user }`

#### Portal API

- `GET /portal-api/getPortalInfo?portalName={name}`: Get portal details
  - Response: Portal object with id, name, display_name, etc.

- `GET /portal-api/getPortalFolders?portalId={id}`: Get folders for portal
  - Headers: `Authorization: Bearer {jwt_token}`
  - Response: `{ folders, userRole, isPortalAdmin }`

## Roles and Permissions

### Super Admin (super)
- Create and manage portals
- Assign portal administrators
- Full access to all folders
- Create admin users

### Admin (admin)
- Manage assigned portals
- Create folders and subfolders
- Assign folder permissions to users
- Grant folder admin access to specific users

### User (user)
- Access folders based on granted permissions
- View content in folders with `canView` permission
- Edit content in folders with `canEdit` permission

## Authentication Flow

1. User visits `/portalName`
2. Portal information is loaded via API
3. User is redirected to `/portalName/login`
4. On login:
   - If username not found → redirect to `/portalName/signup`
   - If credentials valid → JWT token stored in sessionStorage
   - User redirected to `/portalName/dashboard`
5. JWT token is sent with all subsequent API requests

## Session Management

- JWT tokens are stored in `sessionStorage`
- Token includes: userId, username, email, role, expiration
- Tokens expire after 24 hours
- User data cached in sessionStorage for quick access

## Running the Application

### Prerequisites

- Node.js 18+
- Supabase project configured

### Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
npm install
```

### Database Setup

The database migration is located in `supabase/migrations/001_initial_schema.sql`

### Edge Functions

Edge functions are located in `supabase/functions/`:
- `auth-login/`: Handles user authentication
- `auth-signup/`: Handles user registration
- `portal-api/`: Handles portal and folder data

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Usage Examples

### Creating a New Portal

1. Login as super admin
2. Create portal via database or API
3. Assign admins to the portal

### Managing Folders

1. Login as admin for a specific portal
2. Create folders in the dashboard
3. Assign permissions to users

### Accessing Content

1. Login as user
2. View assigned folders in dashboard
3. Access content based on permissions

## Security Features

- JWT-based authentication
- Row Level Security (RLS) policies on all tables
- Password hashing (SHA-256)
- Role-based access control at database level
- Session timeout (24 hours)

## UI Components

### Authentication Pages
- Modern gradient backgrounds
- Responsive forms with validation
- Error handling with user feedback
- Smooth animations

### Dashboard
- Portal header with user info
- Role badges for visual identification
- Folder grid with permission indicators
- Expandable subfolder views

## Future Enhancements

- File upload and content management
- Real-time collaboration
- Email notifications
- Password reset flow
- Advanced folder permissions
- Activity logs and audit trails
- Search and filter functionality
- Bulk operations on folders

## Troubleshooting

### "Portal not found" error
- Verify portal exists in database with correct name
- Check portal `is_active` flag is true

### Authentication issues
- Verify JWT_SECRET is set in Edge Function environment
- Check sessionStorage for stored token
- Verify token hasn't expired

### Permission errors
- Check user role in database
- Verify portal_admins assignments
- Review folder_permissions for user

## License

MIT
# aura
