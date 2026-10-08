import { NavLink } from 'react-router-dom';
import type { AuthUser } from '../types';
import './TopBar.css';

interface TopBarProps {
  readonly currentUser: AuthUser | null;
  readonly onLogout: () => void;
}

const navigationItems = [
  { to: '/overview', label: 'Overview' },
  { to: '/chart', label: 'Spending chart' },
  { to: '/new-subscription', label: 'New subscription' },
];

export default function TopBar({ currentUser, onLogout }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Subscription Tracker</h1>
        </div>
      </div>

      <nav className="main-navigation" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            <span className="nav-icon" aria-hidden="true">
              {item.label.charAt(0)}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="user-greeting">
          {currentUser ? currentUser.displayName : 'Saved on this device'}
        </span>

        {currentUser ? (
          <button type="button" className="ghost-button" onClick={onLogout}>
            Sign out
          </button>
        ) : (
          <NavLink to="/sign-in" className="ghost-button">
            Sign in
          </NavLink>
        )}
      </div>
    </header>
  );
}
