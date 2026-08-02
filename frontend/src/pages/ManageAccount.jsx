import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

const BG = "url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')";

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'white', borderRadius: 20,
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700, color: '#0D2B6B' }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          {title}
        </span>
        <span style={{
          fontSize: 13, color: '#aaa',
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▼</span>
      </button>
      <div style={{
        maxHeight: open ? 800 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease',
      }}>
        <div style={{ height: 1, background: '#f0f0f0', margin: '0 24px' }} />
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1.5px solid #e8e8e8', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
  transition: 'border-color 0.15s',
};

export default function ManageAccount() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]   = useState(null);
  const [cards, setCards]       = useState([]);
  const [loaded, setLoaded]     = useState(false);

  // Photo section
  const [photoFile, setPhotoFile]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMsg, setPhotoMsg]       = useState('');
  const fileRef = useRef();

  // Personal info
  const [info, setInfo]         = useState({ name: '', phone: '', address: '', date_of_birth: '' });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoMsg, setInfoMsg]   = useState('');

  // Add card
  const [newCard, setNewCard]   = useState({ card_last4: '', card_brand: 'Visa', card_expiry: '', cardholder_name: '' });
  const [cardMsg, setCardMsg]   = useState('');
  const [cardSaving, setCardSaving] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/user/profile'),
      api.get('/api/user/cards'),
    ]).then(([p, c]) => {
      setProfile(p.data);
      setCards(c.data);
      setInfo({
        name: p.data.name || '',
        phone: p.data.phone || '',
        address: p.data.address || '',
        date_of_birth: p.data.date_of_birth || '',
      });
      setTimeout(() => setLoaded(true), 60);
    }).catch(() => navigate('/login'));
  }, []);

  const avatarSrc = profile?.avatar_url ? `${API_URL}${profile.avatar_url}` : null;
  const initial   = profile?.name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || '?';

  const cardStyle = (delay = 0) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
  });

  // ── Photo upload ──────────────────────────────────────────────────────────
  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setPhotoMsg('');
  };

  const savePhoto = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoMsg('');
    const fd = new FormData();
    fd.append('photo', photoFile);
    try {
      const { data } = await api.post('/api/user/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(p => ({ ...p, avatar_url: data.avatarUrl }));
      updateUser({ avatar_url: data.avatarUrl });
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoMsg('✓ Photo updated!');
    } catch {
      setPhotoMsg('Upload failed. Please try again.');
    }
    setPhotoSaving(false);
  };

  // ── Personal info ─────────────────────────────────────────────────────────
  const saveInfo = async () => {
    if (!info.name.trim()) { setInfoMsg('Name is required.'); return; }
    setInfoSaving(true);
    setInfoMsg('');
    try {
      const { data } = await api.put('/api/user/profile', info);
      setProfile(data);
      updateUser({ name: data.name });
      setInfoMsg('✓ Profile saved!');
    } catch {
      setInfoMsg('Save failed. Please try again.');
    }
    setInfoSaving(false);
  };

  // ── Cards ─────────────────────────────────────────────────────────────────
  const addCard = async () => {
    if (!newCard.card_last4 || newCard.card_last4.length !== 4 || !newCard.card_expiry) {
      setCardMsg('Please fill in all required card fields.');
      return;
    }
    setCardSaving(true);
    setCardMsg('');
    try {
      const { data } = await api.post('/api/user/cards', newCard);
      setCards(c => [data, ...c]);
      setNewCard({ card_last4: '', card_brand: 'Visa', card_expiry: '', cardholder_name: '' });
      setCardMsg('✓ Card added!');
    } catch {
      setCardMsg('Failed to add card.');
    }
    setCardSaving(false);
  };

  const deleteCard = async (id) => {
    try {
      await api.delete(`/api/user/cards/${id}`);
      setCards(c => c.filter(x => x.id !== id));
    } catch {}
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/api/user/account');
      logout();
      navigate('/');
    } catch {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: BG, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(0,0,20,0.62)' }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 600, margin: '0 auto', padding: '90px 20px 60px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ ...cardStyle(0), background: 'white', borderRadius: 20, padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: avatarSrc ? 'transparent' : '#0D2B6B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: 'white', flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 0 0 3px #F57C00',
          }}>
            {(photoPreview || avatarSrc)
              ? <img src={photoPreview || avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0D2B6B', margin: '0 0 4px' }}>Manage Account</h1>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>{profile?.email}</p>
          </div>
        </div>

        {/* ── Section 1: Profile Photo ── */}
        <div style={cardStyle(0.08)}>
          <Section title="Profile Photo" icon="📷" defaultOpen>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: (photoPreview || avatarSrc) ? 'transparent' : '#f0f0f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, fontWeight: 800, color: '#0D2B6B',
                  overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                  border: '2px dashed #ddd',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#F57C00'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd'}
              >
                {(photoPreview || avatarSrc)
                  ? <img src={photoPreview || avatarSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>📷</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#555', fontSize: 13, margin: '0 0 12px' }}>
                  JPG, PNG or GIF · Max 5 MB
                </p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => fileRef.current?.click()} style={{
                    background: '#f5f5f5', border: '1.5px solid #e0e0e0', color: '#333',
                    padding: '8px 18px', borderRadius: 9, fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Choose Photo
                  </button>
                  {photoFile && (
                    <button onClick={savePhoto} disabled={photoSaving} style={{
                      background: '#0D2B6B', color: 'white',
                      padding: '8px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                      opacity: photoSaving ? 0.7 : 1,
                    }}>
                      {photoSaving ? 'Uploading…' : 'Save Photo'}
                    </button>
                  )}
                </div>
                {photoMsg && (
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: photoMsg.startsWith('✓') ? '#2e7d32' : '#c62828' }}>
                    {photoMsg}
                  </p>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* ── Section 2: Personal Information ── */}
        <div style={cardStyle(0.14)}>
          <Section title="Personal Information" icon="👤">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Full Name *">
                  <input
                    style={inputStyle}
                    value={info.name}
                    onChange={e => setInfo(i => ({ ...i, name: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                    onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                    placeholder="Your full name"
                  />
                </Field>
              </div>
              <Field label="Phone">
                <input
                  style={inputStyle}
                  value={info.phone}
                  onChange={e => setInfo(i => ({ ...i, phone: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                  onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                  placeholder="+1 (555) 000-0000"
                />
              </Field>
              <Field label="Date of Birth">
                <input
                  type="date"
                  style={inputStyle}
                  value={info.date_of_birth ? (info.date_of_birth.includes('/') ? '' : info.date_of_birth) : ''}
                  onChange={e => setInfo(i => ({ ...i, date_of_birth: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                  onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                />
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Address">
                  <input
                    style={inputStyle}
                    value={info.address}
                    onChange={e => setInfo(i => ({ ...i, address: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                    onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                    placeholder="123 Main St, City, State"
                  />
                </Field>
              </div>
            </div>
            <button
              onClick={saveInfo}
              disabled={infoSaving}
              style={{
                background: '#0D2B6B', color: 'white',
                padding: '11px 28px', borderRadius: 10, border: 'none',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                opacity: infoSaving ? 0.7 : 1, marginTop: 4,
              }}
            >
              {infoSaving ? 'Saving…' : 'Save Changes'}
            </button>
            {infoMsg && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: infoMsg.startsWith('✓') ? '#2e7d32' : '#c62828' }}>
                {infoMsg}
              </p>
            )}
          </Section>
        </div>

        {/* ── Section 3: Change Email (Coming Soon) ── */}
        <div style={cardStyle(0.20)}>
          <Section title="Change Email" icon="✉️">
            <div style={{ background: '#f8f9ff', borderRadius: 12, padding: '18px', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                <span style={{ fontWeight: 700, color: '#0D2B6B' }}>Current email: </span>
                {profile?.email}
              </p>
            </div>
            <Field label="New Email Address">
              <input
                style={{ ...inputStyle, background: '#fafafa', color: '#aaa' }}
                placeholder="new@email.com"
                disabled
              />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FFF8E1', borderRadius: 10, border: '1px solid #FFE082' }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <p style={{ margin: 0, fontSize: 13, color: '#795548', fontWeight: 500 }}>
                Email verification coming soon. You'll receive a confirmation link to both your current and new email addresses.
              </p>
            </div>
          </Section>
        </div>

        {/* ── Section 4: Payment Cards ── */}
        <div style={cardStyle(0.26)}>
          <Section title="Payment Cards" icon="💳">
            {/* Saved cards */}
            {cards.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {cards.map(card => (
                  <div key={card.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 12,
                    border: '1.5px solid #e8e8e8', background: '#FAFAFA',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>💳</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0D2B6B', fontSize: 14 }}>
                          {card.card_brand} •••• {card.card_last4}
                        </div>
                        <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>
                          Expires {card.card_expiry}{card.cardholder_name ? ` · ${card.cardholder_name}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCard(card.id)}
                      style={{
                        background: 'none', border: 'none', color: '#cc0000',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new card */}
            <div style={{ background: '#f8f9ff', borderRadius: 12, padding: '18px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0D2B6B', margin: '0 0 14px' }}>+ Add New Card</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Cardholder Name">
                    <input
                      style={inputStyle}
                      placeholder="Name on card"
                      value={newCard.cardholder_name}
                      onChange={e => setNewCard(c => ({ ...c, cardholder_name: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                      onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                    />
                  </Field>
                </div>
                <Field label="Last 4 Digits *">
                  <input
                    style={inputStyle}
                    placeholder="1234"
                    maxLength={4}
                    value={newCard.card_last4}
                    onChange={e => setNewCard(c => ({ ...c, card_last4: e.target.value.replace(/\D/g, '') }))}
                    onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                    onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                  />
                </Field>
                <Field label="Expiry *">
                  <input
                    style={inputStyle}
                    placeholder="MM/YY"
                    maxLength={5}
                    value={newCard.card_expiry}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2,4);
                      setNewCard(c => ({ ...c, card_expiry: v }));
                    }}
                    onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                    onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                  />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Card Type">
                    <select
                      style={{ ...inputStyle, background: 'white' }}
                      value={newCard.card_brand}
                      onChange={e => setNewCard(c => ({ ...c, card_brand: e.target.value }))}
                      onFocus={e => e.target.style.borderColor = '#0D2B6B'}
                      onBlur={e => e.target.style.borderColor = '#e8e8e8'}
                    >
                      <option>Visa</option>
                      <option>Mastercard</option>
                      <option>Amex</option>
                      <option>Discover</option>
                    </select>
                  </Field>
                </div>
              </div>
              <button
                onClick={addCard}
                disabled={cardSaving}
                style={{
                  background: '#F57C00', color: 'white',
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  opacity: cardSaving ? 0.7 : 1, marginTop: 4,
                }}
              >
                {cardSaving ? 'Adding…' : 'Add Card'}
              </button>
              {cardMsg && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: cardMsg.startsWith('✓') ? '#2e7d32' : '#c62828' }}>
                  {cardMsg}
                </p>
              )}
            </div>
          </Section>
        </div>

        {/* ── Section 5: Danger Zone ── */}
        <div style={cardStyle(0.32)}>
          <Section title="Danger Zone" icon="⚠️">
            <div style={{ border: '1.5px solid #ffcdd2', borderRadius: 12, padding: '20px', background: '#fff5f5' }}>
              <h3 style={{ color: '#c62828', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Delete My Account</h3>
              <p style={{ color: '#555', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
                Permanently delete your account and cancel all bookings. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDelete(true)}
                style={{
                  background: '#c62828', color: 'white',
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Delete Account
              </button>
            </div>
          </Section>
        </div>

      </div>

      {/* ── Delete confirmation modal ── */}
      {showDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'white', borderRadius: 20, padding: '36px 32px',
            maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0D2B6B', margin: '0 0 12px' }}>
              Are you sure?
            </h2>
            <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
              This <strong>cannot be undone</strong>. Your account will be permanently deleted.
            </p>
            <ul style={{ textAlign: 'left', color: '#555', fontSize: 13, lineHeight: 1.8, margin: '0 0 24px', paddingLeft: 20 }}>
              <li>All active bookings will be cancelled</li>
              <li>All car rental bookings will be cancelled</li>
              <li>All saved cards will be removed</li>
              <li>Your profile data will be erased</li>
            </ul>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowDelete(false)}
                style={{
                  background: '#f5f5f5', color: '#333', border: '1.5px solid #e0e0e0',
                  padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  background: '#c62828', color: 'white', border: 'none',
                  padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'inherit',
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
