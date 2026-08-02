import { Link } from 'react-router-dom';

const ICONS = { car: '🚗', house: '🏠', agent: '👤' };

export default function ItemCard({ item, type }) {
  const price = type === 'agent' ? item.price_per_hour : item.price_per_day;
  const unit = type === 'agent' ? '/hr' : '/day';
  const desc = item.description || item.bio || '';

  return (
    <div className="card">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="card-img" />
      ) : (
        <div className="card-img-placeholder">{ICONS[type]}</div>
      )}
      <div className="card-body">
        <h3 className="card-title">{item.name}</h3>
        <p className="card-desc">{desc}</p>
        <div className="card-tags">
          {type === 'car' && item.seats && (
            <span className="tag">👥 {item.seats} seats</span>
          )}
          {type === 'house' && item.location && (
            <span className="tag">📍 {item.location}</span>
          )}
          {type === 'house' && item.bedrooms && (
            <span className="tag">🛏 {item.bedrooms} bed</span>
          )}
          {type === 'agent' && item.specialty && (
            <span className="tag">⭐ {item.specialty}</span>
          )}
          {!item.available && (
            <span className="tag tag-unavailable">Unavailable</span>
          )}
        </div>
        <div className="card-price">
          ${Number(price).toFixed(2)}<span>{unit}</span>
        </div>
        {item.available ? (
          <Link to={`/book/${type}/${item.id}`} className="btn btn-primary btn-full">
            Book Now
          </Link>
        ) : (
          <button className="btn btn-secondary btn-full" disabled>
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}
