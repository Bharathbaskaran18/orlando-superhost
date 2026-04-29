import { useState, useEffect } from 'react';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';

export default function Houses() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/houses').then((res) => setHouses(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading houses…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🏠 Available Houses</h1>
      </div>
      {houses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No houses listed yet</h3>
          <p>Check back soon!</p>
        </div>
      ) : (
        <div className="grid">
          {houses.map((house) => <ItemCard key={house.id} item={house} type="house" />)}
        </div>
      )}
    </div>
  );
}
