import { useEffect } from 'react';

const CSS = `
  @keyframes lbFadeIn  { from { opacity: 0 }                          to { opacity: 1 } }
  @keyframes lbZoomIn  { from { opacity: 0; transform: scale(0.88) }  to { opacity: 1; transform: scale(1) } }
`;

export default function PhotoLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <>
      <style>{CSS}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'lbFadeIn 0.2s ease',
          cursor: 'zoom-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, right: 18,
            width: 42, height: 42, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '1.5px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: 20, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
            zIndex: 1,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Photo */}
        <img
          src={src}
          alt={alt || ''}
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '88vw',
            maxHeight: '88vh',
            objectFit: 'contain',
            borderRadius: 10,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            animation: 'lbZoomIn 0.22s ease',
            cursor: 'default',
            userSelect: 'none',
          }}
        />

        {/* Hint */}
        <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, pointerEvents: 'none' }}>
          Press Esc or click outside to close
        </div>
      </div>
    </>
  );
}
