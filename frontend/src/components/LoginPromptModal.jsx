import { useNavigate } from 'react-router-dom';

// Shown when a logged-out user tries to take a booking action (Book Now, Book Agent,
// Request to Apply, etc). `redirectTo` is the path to send them back to after they
// log in or create an account.
export default function LoginPromptModal({ open, onClose, redirectTo }) {
  const navigate = useNavigate();
  if (!open) return null;

  const goTo = (path) => {
    onClose();
    navigate(path, { state: { from: redirectTo } });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔒</div>
        <h2 style={{ marginBottom: 8 }}>Please login or create an account to book</h2>
        <p style={{ color: 'var(--text-muted, #6b6b6b)', fontSize: 14, marginBottom: 24 }}>
          It only takes a minute, and we'll bring you right back here afterward.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-primary btn-full btn-lg" onClick={() => goTo('/login')}>
            Login
          </button>
          <button className="btn btn-accent btn-full btn-lg" onClick={() => goTo('/register')}>
            Create Account
          </button>
          <button className="btn btn-ghost btn-full" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
