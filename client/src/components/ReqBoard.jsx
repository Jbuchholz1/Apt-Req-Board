import { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge';
import EditableCell from './EditableCell';
import { updateJobOverrides } from '../lib/api';

const PRIORITY_COLORS = {
  A: { bg: '#c9a227', text: '#fff' },
  B: { bg: '#475569', text: '#fff' },
  C: { bg: '#94a3b8', text: '#1e293b' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit', timeZone: 'America/Chicago',
  });
}

function formatLocation(city, state) {
  if (city && state) return `${city}, ${state}`;
  return city || state || '—';
}

function formatCurrency(val) {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const COLUMNS = [
  { key: 'priority', label: 'Pri', sortable: true, width: '42px' },
  { key: 'id', label: 'Req#', sortable: true, width: '55px' },
  { key: 'dateAdded', label: 'Date', sortable: true, width: '80px' },
  { key: 'ownerInitials', label: 'AM', sortable: true, width: '40px' },
  { key: 'recruiter', label: 'TR', sortable: true, width: '60px', editable: true },
  { key: 'title', label: 'Job Title', sortable: true },
  { key: 'client', label: 'Client', sortable: true, width: '150px' },
  { key: 'status', label: 'Status', sortable: true, width: '155px' },
  { key: 'deadline', label: 'Deadline', sortable: true, width: '110px', editable: true },
  { key: 'followUp', label: 'Follow Up', sortable: true, width: '120px', editable: true },
  { key: 'brSalary', label: 'BR/Salary', sortable: true, width: '110px' },
  { key: 'ceSpread', label: 'CE $', sortable: true, width: '70px' },
  { key: 'permFee', label: 'Perm $', sortable: true, width: '75px' },
  { key: 'clientContact', label: 'Manager', sortable: true, width: '120px' },
  { key: 'employmentType', label: 'Type', sortable: true, width: '90px' },
  { key: 'remote', label: 'Remote', sortable: true, width: '65px' },
  { key: 'numOpenings', label: '# Op', sortable: true, width: '45px' },
  { key: 'filled', label: '# Fl', sortable: true, width: '45px' },
  { key: 'startDate', label: 'Start', sortable: true, width: '80px' },
  { key: 'estimatedEndDate', label: 'End', sortable: true, width: '80px' },
];

// Maps column keys to the API field names for overrides
const OVERRIDE_FIELD_MAP = {
  recruiter: 'recruiter',
  followUp: 'follow_up',
  deadline: 'deadline',
};

export default function ReqBoard({ jobs, loading, onSelectJob, selectedJobId, onJobUpdated }) {
  const [sort, setSort] = useState({ key: 'dateAdded', dir: 'desc' });

  const handleSort = (key) => {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const handleOverrideSave = async (jobId, field, value) => {
    const apiField = OVERRIDE_FIELD_MAP[field];
    if (!apiField) return;
    try {
      await updateJobOverrides(jobId, { [apiField]: value });
      if (onJobUpdated) onJobUpdated(jobId, field, value);
    } catch (err) {
      console.error('Failed to save override:', err);
    }
  };

  const sorted = useMemo(() => {
    if (!jobs) return [];
    const arr = [...jobs];
    arr.sort((a, b) => {
      let av, bv;
      if (sort.key === 'location') {
        av = formatLocation(a.city, a.state);
        bv = formatLocation(b.city, b.state);
      } else {
        av = a[sort.key];
        bv = b[sort.key];
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [jobs, sort]);

  const sortIcon = (key) => {
    if (sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading && (!jobs || jobs.length === 0)) {
    return <div className="loading-state">Loading requisitions...</div>;
  }

  const renderCell = (job, col) => {
    // Editable cells
    if (col.editable) {
      const placeholder = col.key === 'recruiter' ? 'TR' : col.key === 'deadline' ? 'Deadline' : 'Follow Up';
      return (
        <EditableCell
          key={col.key}
          value={job[col.key]}
          placeholder={placeholder}
          onSave={(val) => handleOverrideSave(job.id, col.key, val)}
          className="cell-editable"
        />
      );
    }

    // Static cells
    switch (col.key) {
      case 'priority':
        return (
          <td key={col.key}>
            {job.priority && (
              <span className="priority-badge" style={{
                backgroundColor: PRIORITY_COLORS[job.priority]?.bg || '#94a3b8',
                color: PRIORITY_COLORS[job.priority]?.text || '#fff',
              }}>{job.priority}</span>
            )}
          </td>
        );
      case 'id':
        return <td key={col.key} className="cell-num cell-muted">{job.id}</td>;
      case 'dateAdded':
        return <td key={col.key} className="cell-date">{formatDate(job.dateAdded)}</td>;
      case 'ownerInitials':
        return <td key={col.key} className="cell-initials">{job.ownerInitials || '—'}</td>;
      case 'title':
        return <td key={col.key} className="cell-title">{job.title}</td>;
      case 'client':
        return <td key={col.key}>{job.client || '—'}</td>;
      case 'status':
        return <td key={col.key}><StatusBadge status={job.status} /></td>;
      case 'brSalary':
        return <td key={col.key} className="cell-money">{job.brSalary || '—'}</td>;
      case 'ceSpread':
        return <td key={col.key} className="cell-money">{job.ceSpread ? formatCurrency(job.ceSpread) : '—'}</td>;
      case 'permFee':
        return <td key={col.key} className="cell-money">{job.permFee ? formatCurrency(job.permFee) : '—'}</td>;
      case 'clientContact':
        return <td key={col.key} className="cell-truncate">{job.clientContact || '—'}</td>;
      case 'numOpenings':
      case 'filled':
        return <td key={col.key} className="cell-num">{job[col.key] ?? '—'}</td>;
      case 'startDate':
      case 'estimatedEndDate':
        return <td key={col.key} className="cell-date">{formatDate(job[col.key])}</td>;
      default:
        return <td key={col.key}>{job[col.key] || '—'}</td>;
    }
  };

  return (
    <div className="req-board-wrapper">
      <table className="req-board">
        <thead>
          <tr>
            {COLUMNS.map(col => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`${col.sortable ? 'sortable' : ''} ${col.editable ? 'editable-header' : ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                {col.label}
                {col.sortable && <span className="sort-icon">{sortIcon(col.key)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(job => (
            <tr
              key={job.id}
              className={`req-row ${selectedJobId === job.id ? 'selected' : ''}`}
              onClick={() => onSelectJob(job.id)}
            >
              {COLUMNS.map(col => renderCell(job, col))}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="empty-state">No requisitions match your filters</div>
      )}
    </div>
  );
}
