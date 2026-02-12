import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/settings', label: 'Settings' },
  { to: '/run-wizard', label: 'Run Wizard' },
  { to: '/results', label: 'Results' }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>MLP → ClickUp</h1>
        <p>Tauri desktop workflow shell</p>
      </header>
      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active-link' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
