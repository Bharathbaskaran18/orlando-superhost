import { useState, useEffect } from 'react';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cars').then((res) => setCars(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><p>Loading cars…</p></div>;

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🚗 Available Cars</h1>
      </div>
      {cars.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <h3>No cars listed yet</h3>
          <p>Check back soon!</p>
        </div>
      ) : (
        <div className="grid">
          {cars.map((car) => <ItemCard key={car.id} item={car} type="car" />)}
        </div>
      )}
    </div>
  );
}
