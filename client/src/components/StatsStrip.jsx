export default function StatsStrip({ stats, loading }) {
  const items = [
    { label: 'Open Reqs', value: stats?.openReqs, color: '#c9a227' },
    { label: 'Accepting', value: stats?.acceptingCandidates, color: '#16a34a' },
    { label: 'Offers Out', value: stats?.offersOut, color: '#ea580c' },
    { label: 'Covered', value: stats?.covered, color: '#2563eb' },
    { label: 'Placed', value: stats?.placed, color: '#9333ea' },
    { label: 'Active Contractors', value: stats?.activeContractors, color: '#0d9488' },
  ];

  return (
    <div className="stats-strip">
      {items.map(item => (
        <div key={item.label} className="stat-card">
          <div className="stat-value" style={{ color: item.color }}>
            {loading ? '—' : (item.value ?? 0)}
          </div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
