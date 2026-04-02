const STATUS_COLORS = {
  'Accepting Candidates': { bg: '#16a34a', text: '#fff' },
  'Covered':             { bg: '#2563eb', text: '#fff' },
  'Offer Out':           { bg: '#ea580c', text: '#fff' },
  'Placed':              { bg: '#9333ea', text: '#fff' },
  'Filled':              { bg: '#0d9488', text: '#fff' },
  'Lost':                { bg: '#dc2626', text: '#fff' },
  'Wash':                { bg: '#6b7280', text: '#fff' },
  'Archive':             { bg: '#374151', text: '#9ca3af' },
};

export default function StatusBadge({ status }) {
  const colors = STATUS_COLORS[status] || { bg: '#6b7280', text: '#fff' };
  return (
    <span
      className="status-badge"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {status || '—'}
    </span>
  );
}
