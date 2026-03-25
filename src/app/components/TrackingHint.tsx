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
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.5)',
        padding: '10px 18px',
        borderRadius: 14,
        color: '#fff',
        fontSize: 14,
        fontWeight: 500,
        backdropFilter: 'blur(6px)',
        pointerEvents: 'none',
        textAlign: 'center',
        zIndex: 20,
        maxWidth: '80%',
      }}
    >
      {hint}
    </div>
  );
}