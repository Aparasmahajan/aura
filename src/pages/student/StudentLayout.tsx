import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, BookOpen, ClipboardList, Calendar, CreditCard, User, LogOut, GraduationCap, Menu, X
} from 'lucide-react';
import './StudentLayout.scss';

const NAV = [
  { to: 'home',        icon: <Home size={18} />,         label: 'Home' },
  { to: 'lectures',   icon: <BookOpen size={18} />,      label: 'Lectures' },
  { to: 'exams',      icon: <GraduationCap size={18} />, label: 'Exams' },
  { to: 'assignments',icon: <ClipboardList size={18} />, label: 'Assignments' },
  { to: 'attendance', icon: <Calendar size={18} />,      label: 'Attendance' },
  { to: 'fees',       icon: <CreditCard size={18} />,    label: 'Fees' },
  { to: 'profile',    icon: <User size={18} />,          label: 'Profile' },
];

const StudentLayout: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/${portalName}/login`, { replace: true });
      return;
    }
    if (user && user.role !== 'student') {
      navigate(`/${portalName}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    logout();
    navigate(`/${portalName}/login`);
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="student-layout">
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle menu">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-brand">
          <GraduationCap size={20} />
          <span>Student Portal</span>
        </div>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`student-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <GraduationCap size={28} />
          <span>Student Portal</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={`/${portalName}/student/${to}`}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={closeSidebar}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{(user?.username?.[0] ?? 'S').toUpperCase()}</div>
            <div className="user-meta">
              <span className="user-name">{user?.fullName || user?.username}</span>
              <span className="user-role">Student</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="student-main">
        <Outlet />
      </main>
    </div>
  );
};

export default StudentLayout;
