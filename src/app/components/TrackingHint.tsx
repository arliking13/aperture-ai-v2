interface TrackingHintProps {
  hint: string | null;
  hidden?: boolean;
}

export default function TrackingHint({ hint, hidden = false }: TrackingHintProps) {
  if (!hint || hidden) return null;

  return (
    <div
      style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(255,0,0,0.85)',
  border: '2px solid yellow',
  padding: '16px 24px',
  borderRadius: 14,
  color: '#fff',
  fontSize: 20,
  fontWeight: 700,
  pointerEvents: 'none',
  textAlign: 'center',
  zIndex: 9999,
  maxWidth: '80%',
}}
    >
      {hint}
    </div>
  );
}