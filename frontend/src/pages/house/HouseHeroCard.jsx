import { API_URL } from '../../utils/api';

const STEP_CSS = `
  @keyframes houseSlideDown{ from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
`;

export function HouseStepBar({ currentStep = 1 }) {
  const steps = ['Move-In Details', 'Your Details', 'Payment'];
  return (
    <>
      <style>{STEP_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
        {steps.map((label, i) => {
          const num      = i + 1;
          const isActive = num === currentStep;
          const isDone   = num < currentStep;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isActive ? '#1565C0' : isDone ? '#16A34A' : 'rgba(255,255,255,0.15)',
                  border: isActive ? 'none' : isDone ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 14,
                  boxShadow: isActive ? '0 4px 18px rgba(21,101,192,0.45)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? '✓' : num}
                </div>
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? 'white' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 60, height: 2, background: isDone ? '#16A34A' : 'rgba(255,255,255,0.2)', margin: '0 8px', marginBottom: 22, transition: 'background 0.3s' }} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function HouseHeroCard({ house }) {
  if (!house) return null;
  const photo = house.photos?.[0];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 24,
      display: 'flex', gap: 0, animation: 'houseSlideDown 0.4s ease',
    }}>
      {photo ? (
        <img src={`${API_URL}/uploads/${photo}`} alt="" style={{ width: 140, height: 110, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 140, height: 110, background: 'linear-gradient(135deg, #1565C0, #42A5F5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>🏠</div>
      )}
      <div style={{ padding: '14px 18px', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1565C0', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {house.name}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>{house.address}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#666' }}>🛏 {house.bedrooms || house.rooms || 1} bed</span>
          <span style={{ fontSize: 12, color: '#666' }}>🚿 {house.bathrooms} bath</span>
          <span style={{ fontSize: 12, color: '#666' }}>📅 {house.min_rental_months}–{house.max_rental_months} mo</span>
        </div>
      </div>
      <div style={{ padding: '14px 16px', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1565C0' }}>${Number(house.price_per_month || 0).toFixed(2)}</div>
        <div style={{ fontSize: 11, color: '#777' }}>per month</div>
      </div>
    </div>
  );
}
