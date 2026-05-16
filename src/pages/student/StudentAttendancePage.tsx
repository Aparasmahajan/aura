import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import './StudentAttendancePage.scss';

interface AttendanceRecord {
  id: string;
  folderId: string;
  folderName?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface FolderSummary {
  folderId: string;
  folderName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percent: number;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  present: <CheckCircle size={14} className="s-present" />,
  absent:  <XCircle size={14} className="s-absent" />,
  late:    <Clock size={14} className="s-late" />,
  excused: <AlertCircle size={14} className="s-excused" />,
};

const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const { folders } = usePortal();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summaries, setSummaries] = useState<FolderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  const folderMap: Record<string, string> = Object.fromEntries(
    folders.map(f => [f.id, f.name])
  );

  useEffect(() => {
    if (!user?.id) return;
    loadAttendance();
  }, [user?.id]);

  const loadAttendance = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await apiClient.getMyAttendance(user.id);
    setLoading(false);
    if (!res.data) return;

    const items: AttendanceRecord[] = (Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [])
      .map((r: any) => ({
        ...r,
        folderName: folderMap[r.folderId] ?? r.folderId,
      }));

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setRecords(items);

    // build per-folder summaries
    const byFolder: Record<string, AttendanceRecord[]> = {};
    items.forEach(r => {
      if (!byFolder[r.folderId]) byFolder[r.folderId] = [];
      byFolder[r.folderId].push(r);
    });
    const sums: FolderSummary[] = Object.entries(byFolder).map(([fid, recs]) => {
      const total   = recs.length;
      const present = recs.filter(r => r.status === 'present').length;
      const absent  = recs.filter(r => r.status === 'absent').length;
      const late    = recs.filter(r => r.status === 'late').length;
      const excused = recs.filter(r => r.status === 'excused').length;
      return {
        folderId: fid,
        folderName: folderMap[fid] ?? fid,
        total, present, absent, late, excused,
        percent: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      };
    });
    setSummaries(sums);
  };

  const displayed = selectedFolder === 'all'
    ? records
    : records.filter(r => r.folderId === selectedFolder);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="student-attendance">
      <div className="page-header">
        <h1>Attendance</h1>
        <p>Your attendance across all subjects</p>
      </div>

      {/* Summary cards */}
      {summaries.length > 0 && (
        <div className="summary-cards">
          {summaries.map(s => (
            <div
              key={s.folderId}
              className={`summary-card${s.percent < 75 ? ' low' : ''}`}
              onClick={() => setSelectedFolder(s.folderId === selectedFolder ? 'all' : s.folderId)}
            >
              <h4>{s.folderName}</h4>
              <div className="percent-ring" style={{ '--pct': s.percent } as any}>
                <span>{s.percent}%</span>
              </div>
              <div className="summary-stats">
                <span className="s-present">P: {s.present}</span>
                <span className="s-absent">A: {s.absent}</span>
                <span className="s-late">L: {s.late}</span>
              </div>
              {s.percent < 75 && <p className="low-warn">Below 75%</p>}
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {folders.length > 0 && (
        <div className="filter-row">
          <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
            <option value="all">All Subjects</option>
            {Object.entries(folderMap).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Records table */}
      {loading ? (
        <div className="spinner-center"><div className="spinner" /></div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <p>No attendance records found</p>
        </div>
      ) : (
        <div className="attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => (
                <tr key={r.id} className={`row-${r.status}`}>
                  <td>{formatDate(r.date)}</td>
                  <td>{r.folderName}</td>
                  <td>
                    <span className={`status-chip chip-${r.status}`}>
                      {STATUS_ICON[r.status]}
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td className="notes-cell">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentAttendancePage;
