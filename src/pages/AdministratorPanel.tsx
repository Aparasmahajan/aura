import React, { useEffect, useState } from 'react';
import { usePortal } from '../contexts/PortalContext';
import { apiClient } from '../utils/api';
import { CreditCard, Calendar, Megaphone, Plus, X, Save } from 'lucide-react';
import './AdministratorPanel.scss';

type Tab = 'fees' | 'attendance' | 'news';

interface StudentRow {
  id: string;
  username: string;
  email: string;
  fullName?: string;
}

const AdministratorPanel: React.FC = () => {
  const { portal, folders } = usePortal();

  const [tab, setTab] = useState<Tab>('fees');

  // ── Fee tab ─────────────────────────────────────────────
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [feeForm, setFeeForm] = useState({
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    totalAmount: '',
    paidAmount: '',
    dueDate: '',
    paymentStatus: 'pending' as const,
    paymentNotes: '',
  });
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMsg, setFeeMsg] = useState('');

  // ── Attendance tab ──────────────────────────────────────
  const [attnFolder, setAttnFolder] = useState('');
  const [attnDate, setAttnDate] = useState(new Date().toISOString().split('T')[0]);
  const [attnRecords, setAttnRecords] = useState<{ studentId: string; status: string; notes: string }[]>([]);
  const [attnStudents, setAttnStudents] = useState<StudentRow[]>([]);
  const [attnSaving, setAttnSaving] = useState(false);
  const [attnMsg, setAttnMsg] = useState('');

  // ── News tab ─────────────────────────────────────────────
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsFolderId, setNewsFolderId] = useState('');
  const [newsPinned, setNewsPinned] = useState(false);
  const [newsPosting, setNewsPosting] = useState(false);
  const [newsError, setNewsError] = useState('');

  useEffect(() => {
    if (!portal?.id) return;
    if (tab === 'fees' || tab === 'attendance') loadStudents();
    if (tab === 'news') loadNews();
  }, [tab, portal?.id]);

  useEffect(() => {
    if (attnFolder) {
      setAttnRecords(attnStudents.map(s => ({ studentId: s.id, status: 'present', notes: '' })));
    }
  }, [attnFolder, attnStudents]);

  useEffect(() => {
    setAttnStudents(students);
  }, [students]);

  const loadStudents = async () => {
    if (!portal?.id) return;
    setStudentsLoading(true);
    const res = await apiClient.getPortalStudents(portal.id);
    setStudentsLoading(false);
    if (res.data) {
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setStudents(items);
    }
  };

  const loadNews = async () => {
    if (!portal?.id) return;
    setNewsLoading(true);
    const res = await apiClient.getNews({ portalId: portal.id });
    setNewsLoading(false);
    if (res.data) {
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setNews(items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  };

  const handleSaveFee = async () => {
    if (!selectedStudent || !feeForm.totalAmount) return;
    setFeeSaving(true);
    setFeeMsg('');
    const res = await apiClient.upsertFeeRecord({
      studentId: selectedStudent.id,
      portalId: portal!.id,
      academicYear: feeForm.academicYear,
      totalAmount: parseFloat(feeForm.totalAmount),
      paidAmount: parseFloat(feeForm.paidAmount || '0'),
      dueDate: feeForm.dueDate || undefined,
      paymentStatus: feeForm.paymentStatus,
      paymentNotes: feeForm.paymentNotes || undefined,
    });
    setFeeSaving(false);
    setFeeMsg(res.error ? `Error: ${res.error}` : 'Fee record saved!');
    setTimeout(() => setFeeMsg(''), 3000);
  };

  const handleSaveAttendance = async () => {
    if (!attnFolder || attnRecords.length === 0) return;
    setAttnSaving(true);
    setAttnMsg('');
    const records = attnRecords.map(r => ({
      studentId: r.studentId,
      folderId: attnFolder,
      date: attnDate,
      status: r.status as any,
      notes: r.notes || undefined,
    }));
    const res = await apiClient.markAttendance(records);
    setAttnSaving(false);
    setAttnMsg(res.error ? `Error: ${res.error}` : 'Attendance saved!');
    setTimeout(() => setAttnMsg(''), 3000);
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsBody) { setNewsError('Title and body are required.'); return; }
    setNewsPosting(true);
    setNewsError('');
    const res = await apiClient.createNews({
      portalId: portal!.id,
      folderId: newsFolderId || null,
      title: newsTitle,
      body: newsBody,
      isPinned: newsPinned,
    });
    setNewsPosting(false);
    if (res.error) { setNewsError(res.error); return; }
    setShowNewsForm(false);
    setNewsTitle(''); setNewsBody(''); setNewsFolderId(''); setNewsPinned(false);
    loadNews();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h1>Administrator Panel</h1>
        <p>Manage fee records, attendance, and announcements</p>
      </div>

      <div className="panel-tabs">
        {(['fees', 'attendance', 'news'] as Tab[]).map(t => (
          <button key={t} className={`panel-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'fees' && <><CreditCard size={15} /> Fees</>}
            {t === 'attendance' && <><Calendar size={15} /> Attendance</>}
            {t === 'news' && <><Megaphone size={15} /> Announcements</>}
          </button>
        ))}
      </div>

      {/* ── Fees ─────────────────────────────────────────── */}
      {tab === 'fees' && (
        <div className="fee-manager">
          <div className="two-col">
            <div className="student-selector card">
              <h3>Select Student</h3>
              {studentsLoading ? (
                <div className="spinner-center"><div className="spinner" /></div>
              ) : (
                <ul className="student-list">
                  {students.map(s => (
                    <li
                      key={s.id}
                      className={`student-item${selectedStudent?.id === s.id ? ' selected' : ''}`}
                      onClick={() => setSelectedStudent(s)}
                    >
                      <div className="s-avatar">{(s.username[0] ?? 'S').toUpperCase()}</div>
                      <div>
                        <p className="s-name">{s.fullName || s.username}</p>
                        <p className="s-email">{s.email}</p>
                      </div>
                    </li>
                  ))}
                  {students.length === 0 && <li className="no-students">No students found</li>}
                </ul>
              )}
            </div>

            <div className="fee-form card">
              <h3>{selectedStudent ? `Fee for: ${selectedStudent.fullName || selectedStudent.username}` : 'Select a student'}</h3>
              {selectedStudent ? (
                <>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Academic Year</label>
                      <input value={feeForm.academicYear} onChange={e => setFeeForm(f => ({ ...f, academicYear: e.target.value }))} />
                    </div>
                    <div className="form-field">
                      <label>Payment Status</label>
                      <select value={feeForm.paymentStatus} onChange={e => setFeeForm(f => ({ ...f, paymentStatus: e.target.value as any }))}>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Total Fee (₹)</label>
                      <input type="number" placeholder="0" value={feeForm.totalAmount} onChange={e => setFeeForm(f => ({ ...f, totalAmount: e.target.value }))} />
                    </div>
                    <div className="form-field">
                      <label>Paid Amount (₹)</label>
                      <input type="number" placeholder="0" value={feeForm.paidAmount} onChange={e => setFeeForm(f => ({ ...f, paidAmount: e.target.value }))} />
                    </div>
                    <div className="form-field">
                      <label>Due Date</label>
                      <input type="date" value={feeForm.dueDate} onChange={e => setFeeForm(f => ({ ...f, dueDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Payment Notes</label>
                    <textarea rows={2} value={feeForm.paymentNotes} onChange={e => setFeeForm(f => ({ ...f, paymentNotes: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  {feeMsg && <p className={`form-msg${feeMsg.startsWith('Error') ? ' error' : ' success'}`}>{feeMsg}</p>}
                  <button className="btn-save" onClick={handleSaveFee} disabled={feeSaving}>
                    <Save size={14} /> {feeSaving ? 'Saving...' : 'Save Fee Record'}
                  </button>
                </>
              ) : (
                <p className="select-prompt">Select a student from the left to manage their fees</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance ────────────────────────────────────── */}
      {tab === 'attendance' && (
        <div className="attendance-manager card">
          <div className="attn-controls">
            <div className="form-field">
              <label>Subject / Folder</label>
              <select value={attnFolder} onChange={e => setAttnFolder(e.target.value)}>
                <option value="">Select folder...</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date</label>
              <input type="date" value={attnDate} onChange={e => setAttnDate(e.target.value)} />
            </div>
          </div>

          {attnFolder && (
            <>
              <table className="attn-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attnStudents.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        <p className="s-name">{s.fullName || s.username}</p>
                        <p className="s-email">{s.email}</p>
                      </td>
                      <td>
                        <select
                          value={attnRecords[i]?.status ?? 'present'}
                          onChange={e => {
                            const next = [...attnRecords];
                            next[i] = { ...next[i], status: e.target.value };
                            setAttnRecords(next);
                          }}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={attnRecords[i]?.notes ?? ''}
                          onChange={e => {
                            const next = [...attnRecords];
                            next[i] = { ...next[i], notes: e.target.value };
                            setAttnRecords(next);
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {attnStudents.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No students found</td></tr>
                  )}
                </tbody>
              </table>
              {attnMsg && <p className={`form-msg${attnMsg.startsWith('Error') ? ' error' : ' success'}`}>{attnMsg}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button className="btn-save" onClick={handleSaveAttendance} disabled={attnSaving}>
                  <Save size={14} /> {attnSaving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}

          {!attnFolder && <p className="select-prompt">Select a folder to mark attendance</p>}
        </div>
      )}

      {/* ── News ─────────────────────────────────────────── */}
      {tab === 'news' && (
        <div className="news-manager">
          <div className="news-actions-row">
            <button className="btn-post-news" onClick={() => setShowNewsForm(true)}>
              <Plus size={15} /> Post Announcement
            </button>
          </div>

          {showNewsForm && (
            <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewsForm(false); }}>
              <div className="news-form-modal">
                <div className="nfm-header">
                  <h3>Post Announcement</h3>
                  <button onClick={() => setShowNewsForm(false)}><X size={18} /></button>
                </div>
                <form className="nfm-body" onSubmit={handlePostNews}>
                  <label>Title *</label>
                  <input value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="Announcement title" required />
                  <label>Body *</label>
                  <textarea rows={4} value={newsBody} onChange={e => setNewsBody(e.target.value)} placeholder="Write your announcement..." required />
                  <label>Target (optional)</label>
                  <select value={newsFolderId} onChange={e => setNewsFolderId(e.target.value)}>
                    <option value="">Global (all students in portal)</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <label className="toggle-label-row">
                    <input type="checkbox" checked={newsPinned} onChange={e => setNewsPinned(e.target.checked)} />
                    Pin this announcement
                  </label>
                  {newsError && <p className="form-error">{newsError}</p>}
                  <div className="nfm-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowNewsForm(false)}>Cancel</button>
                    <button type="submit" className="btn-post" disabled={newsPosting}>{newsPosting ? 'Posting...' : 'Post'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {newsLoading ? (
            <div className="spinner-center"><div className="spinner" /></div>
          ) : news.length === 0 ? (
            <div className="empty-state"><Megaphone size={48} /><p>No announcements yet</p></div>
          ) : (
            <div className="news-items">
              {news.map(n => (
                <div key={n.id} className={`news-item${n.isPinned ? ' pinned' : ''}`}>
                  <div className="ni-header">
                    <span className="ni-title">{n.title}</span>
                    <div className="ni-meta">
                      {n.isPinned && <span className="pin-chip">Pinned</span>}
                      {n.folderId ? <span className="scope-chip folder">Folder</span> : <span className="scope-chip global">Global</span>}
                      <span className="ni-time">{timeAgo(n.createdAt)}</span>
                      <button className="btn-del-news" onClick={() => { apiClient.deleteNews(n.id); setNews(prev => prev.filter(x => x.id !== n.id)); }}><X size={13} /></button>
                    </div>
                  </div>
                  <p className="ni-body">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdministratorPanel;
