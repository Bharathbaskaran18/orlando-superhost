import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      <div className="hero">
        <h1>Book <span>Cars, Houses & Agents</span></h1>
        <p>Find and reserve exactly what you need — fast, easy, and secure.</p>
        <div className="hero-cards">
          <Link to="/cars" className="hero-card">
            <span className="hero-card-icon">🚗</span>
            <h3>Cars</h3>
            <p>Rent a car for your trip</p>
          </Link>
          <Link to="/houses" className="hero-card">
            <span className="hero-card-icon">🏠</span>
            <h3>Houses</h3>
            <p>Find your perfect stay</p>
          </Link>
          <Link to="/agents" className="hero-card">
            <span className="hero-card-icon">👤</span>
            <h3>Agents</h3>
            <p>Connect with a professional</p>
          </Link>
        </div>
      </div>
    </>
  );
}
