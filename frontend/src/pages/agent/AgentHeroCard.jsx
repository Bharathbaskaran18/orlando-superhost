import { API_URL } from '../../utils/api';

const STEP_CSS = `
  @keyframes agentFadeIn { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
`;

export function AgentStepBar({ currentStep = 1 }) {
  const steps = ['Select Time', 'Your Details', 'Payment'];
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
                  background: isActive ? '#0D2B6B' : isDone ? '#16A34A' : 'rgba(255,255,255,0.15)',
                  border: isActive ? 'none' : isDone ? 'none' : '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 14,
                  boxShadow: isActive ? '0 4px 18px rgba(13,43,107,0.5)' : 'none',
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

export function AgentHeroCard({ agent }) {
  if (!agent) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.97)', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', marginBottom: 24,
      display: 'flex', gap: 0, animation: 'agentFadeIn 0.4s ease',
    }}>
      {agent.photo ? (
        <img src={`${API_URL}/uploads/${agent.photo}`} alt={agent.name} style={{ width: 120, height: 100, objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
      ) : (
        <div style={{ width: 120, height: 100, background: 'linear-gradient(135deg, #0D2B6B, #1565C0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>🧭</div>
      )}
      <div style={{ padding: '14px 18px', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#0D2B6B', marginBottom: 2 }}>{agent.name}</div>
        <div style={{ fontSize: 13, color: '#1565C0', fontWeight: 600, marginBottom: 4 }}>{agent.specialty}</div>
        {agent.meeting_location && (
          <div style={{ fontSize: 12, color: '#666' }}>📍 {agent.meeting_location}</div>
        )}
      </div>
      <div style={{ padding: '14px 16px', textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0D2B6B' }}>${Number(agent.hourly_rate).toFixed(2)}</div>
        <div style={{ fontSize: 11, color: '#777' }}>per hour</div>
      </div>
    </div>
  );
}
