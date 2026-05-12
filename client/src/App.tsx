import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Detail } from './pages/Detail';
import { Favorites } from './pages/Favorites';
import { Footer } from './components/Footer';

export const App = () => (
  <div className="app">
    <header className="header">
      <Link to="/" className="brand">
        <span className="brand-dot" />
        <span>Space Gallery</span>
        <span className="brand-tag">Prisma From Zero</span>
      </Link>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Gallery
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          Favorites
        </NavLink>
      </nav>
    </header>
    <main className="main">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/photo/:date" element={<Detail />} />
        <Route path="/favorites" element={<Favorites />} />
      </Routes>
    </main>
    <Footer />
  </div>
);
