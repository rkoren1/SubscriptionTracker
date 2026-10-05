import type { AuthUser } from '../types';
import './TopBar.css';

type ViewMode = 'overview' | 'chart';

interface TopBarProps {
  activeView: ViewMode;
  currentUser: AuthUser | null;
  onViewChange: (view: ViewMode) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  onNewSubscription: () => void;
}

export default function TopBar({
  activeView,
  currentUser,
  onViewChange,
  onLogout,
  onOpenAuth,
  onNewSubscription,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">
          {activeView === 'overview' ? 'Overview' : 'Spending trends'}
        </p>
        <h1>Subscription Tracker</h1>
      </div>
      <div className="topbar-actions">
        <span className="user-greeting">
          {currentUser ? currentUser.displayName : 'Saved on this device'}
        </span>
        <div className="view-switcher" aria-label="Page view selector">
          <button
            type="button"
            className={
              activeView === 'overview' ? 'view-button active' : 'view-button'
            }
            onClick={() => onViewChange('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={
              activeView === 'chart' ? 'view-button active' : 'view-button'
            }
            onClick={() => onViewChange('chart')}
          >
            Spending chart
          </button>
        </div>
        {currentUser ? (
          <button type="button" className="ghost-button" onClick={onLogout}>
            Sign out
          </button>
        ) : (
          <button type="button" className="ghost-button" onClick={onOpenAuth}>
            Sign in to sync
          </button>
        )}
        <button
          type="button"
          className="ghost-button"
          onClick={onNewSubscription}
        >
          New subscription
        </button>
      </div>
    </header>
  );
}
