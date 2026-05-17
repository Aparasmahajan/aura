import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { ClipboardList, Clock, Upload, CheckCircle, AlertCircle, X, FileText, Link, GraduationCap } from 'lucide-react';
import './StudentAssignmentsPage.scss';

interface Assignment {
  id: string;
  folderId: string;
  folderName: string;
  title: string;
  description?: string;
  fileUrl?: string;
  textContent?: string;
  examCode?: string;
  assignmentType?: 'LINK' | 'TEXT' | 'EXAM';
  dueDate?: string;
  submission?: {
    submittedAt: string;
    grade?: string;
    feedback?: string;
  };
}

type SubmitTab = 'TEXT' | 'FILE' | 'EXAM';

const StudentAssignmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { portal } = usePortal();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState<Assignment | null>(null);
  const [submitTab, setSubmitTab] = useState<SubmitTab>('FILE');
  const [submitText, setSubmitText] = useState('');
  const [submitUrl, setSubmitUrl] = useState('');
  const [examLink, setExamLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!portal?.id) return;
    loadAssignments();
  }, [portal?.id]);

  const loadAssignments = async () => {
    setLoading(true);
    const foldersRes = await apiClient.getPortalFolders(portal!.id);
    const rawFolders = Array.isArray(foldersRes.data) ? foldersRes.data : [];
    if (rawFolders.length === 0) { setLoading(false); return; }

    const results: Assignment[] = [];
    await Promise.all(
      rawFolders.map(async (f: any) => {
        const fid = String(f.folderId ?? f.id);
        const fname = f.name ?? '';
        const res = await apiClient.getFolderAssignments(fid);
        if (!res.error) {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          items.forEach((a: any) => results.push({ ...a, id: String(a.id ?? a.assignmentId), folderId: fid, folderName: fname }));
        }
      })
    );

    results.sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    setAssignments(results);
    setLoading(false);
  };

  const openSubmit = (a: Assignment) => {
    setSubmitModal(a);
    const defaultTab: SubmitTab = a.assignmentType === 'EXAM' ? 'EXAM' : a.assignmentType === 'TEXT' ? 'TEXT' : 'FILE';
    setSubmitTab(defaultTab);
    setSubmitText('');
    setSubmitUrl('');
    setExamLink('');
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    if (!submitModal) return;
    if (submitTab === 'TEXT' && !submitText.trim()) {
      setSubmitError('Please type your response.');
      return;
    }
    if (submitTab === 'FILE' && !submitUrl.trim()) {
      setSubmitError('Please enter a file URL.');
      return;
    }
    if (submitTab === 'EXAM' && !examLink.trim()) {
      setSubmitError('Please enter the exam link.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    const res = await apiClient.submitAssignment(submitModal.id, {
      submissionType: submitTab,
      textResponse: submitTab === 'TEXT' ? submitText : undefined,
      fileUrl: submitTab === 'FILE' ? submitUrl : undefined,
      examLink: submitTab === 'EXAM' ? examLink : undefined,
    });
    setSubmitting(false);
    if (res.error) { setSubmitError(res.error); return; }
    setSubmitSuccess(true);
    setAssignments(prev => prev.map(a =>
      a.id === submitModal.id ? { ...a, submission: { submittedAt: new Date().toISOString() } } : a
    ));
    setTimeout(() => setSubmitModal(null), 1500);
  };

  const isPastDue = (dueDate?: string) =>
    dueDate ? new Date(dueDate).getTime() < Date.now() : false;

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleString() : '';

  return (
    <div className="student-assignments">
      <div className="page-header">
        <h1>Assignments</h1>
        <p>Submit your work before the deadline</p>
      </div>

      {loading ? (
        <div className="spinner-center"><div className="spinner" /></div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <p>No assignments yet</p>
        </div>
      ) : (
        <div className="assignments-list">
          {assignments.map(a => {
            const submitted = !!a.submission;
            const pastDue = isPastDue(a.dueDate);
            return (
              <div key={a.id} className={`assignment-card${submitted ? ' submitted' : pastDue ? ' overdue' : ''}`}>
                <div className="asgn-header">
                  <div>
                    <h3>{a.title}</h3>
                    <p className="asgn-folder">{a.folderName}</p>
                  </div>
                  {submitted ? (
                    <span className="badge badge-green"><CheckCircle size={12} /> Submitted</span>
                  ) : pastDue ? (
                    <span className="badge badge-red"><AlertCircle size={12} /> Overdue</span>
                  ) : (
                    <span className="badge badge-blue">Pending</span>
                  )}
                </div>

                {a.description && <p className="asgn-desc">{a.description}</p>}
                {a.textContent && <p className="asgn-desc">{a.textContent}</p>}

                <div className="asgn-meta">
                  {a.dueDate && (
                    <span className={`due-date${pastDue && !submitted ? ' past' : ''}`}>
                      <Clock size={12} /> Due: {formatDate(a.dueDate)}
                    </span>
                  )}
                  {a.fileUrl && (
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" className="asgn-file-link">
                      View Assignment File
                    </a>
                  )}
                </div>

                {submitted && a.submission?.grade && (
                  <div className="grade-section">
                    <span>Grade: <strong>{a.submission.grade}</strong></span>
                    {a.submission.feedback && <p>{a.submission.feedback}</p>}
                  </div>
                )}

                {!submitted && !pastDue && (
                  <button className="btn-submit-asgn" onClick={() => openSubmit(a)}>
                    <Upload size={14} /> Submit
                  </button>
                )}

                {submitted && (
                  <p className="submitted-at">Submitted: {formatDate(a.submission!.submittedAt)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit modal */}
      {submitModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSubmitModal(null); }}>
          <div className="submit-modal">
            <div className="submit-modal-header">
              <h3>Submit: {submitModal.title}</h3>
              <button onClick={() => setSubmitModal(null)}><X size={18} /></button>
            </div>

            <div className="submit-modal-body">
              {/* Submission type tabs */}
              <div className="sub-type-tabs">
                <button
                  className={`sub-type-tab${submitTab === 'FILE' ? ' active' : ''}`}
                  onClick={() => setSubmitTab('FILE')}
                >
                  <Link size={14} /> File URL
                </button>
                <button
                  className={`sub-type-tab${submitTab === 'TEXT' ? ' active' : ''}`}
                  onClick={() => setSubmitTab('TEXT')}
                >
                  <FileText size={14} /> Text
                </button>
                <button
                  className={`sub-type-tab${submitTab === 'EXAM' ? ' active' : ''}`}
                  onClick={() => setSubmitTab('EXAM')}
                >
                  <GraduationCap size={14} /> Exam
                </button>
              </div>

              {submitTab === 'FILE' && (
                <>
                  <label>File URL (Google Drive, GitHub, etc.)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={submitUrl}
                    onChange={e => setSubmitUrl(e.target.value)}
                  />
                </>
              )}

              {submitTab === 'TEXT' && (
                <>
                  <label>Write your response</label>
                  <textarea
                    rows={6}
                    placeholder="Type your answer here..."
                    value={submitText}
                    onChange={e => setSubmitText(e.target.value)}
                  />
                </>
              )}

              {submitTab === 'EXAM' && (
                <>
                  <label>Exam link</label>
                  {submitModal.examCode && (
                    <p className="exam-hint">
                      Exam code: <strong>{submitModal.examCode}</strong>
                    </p>
                  )}
                  <input
                    type="url"
                    placeholder="Paste your exam submission link..."
                    value={examLink}
                    onChange={e => setExamLink(e.target.value)}
                  />
                </>
              )}

              {submitError && <p className="form-error">{submitError}</p>}
              {submitSuccess && <p className="form-success">Submitted successfully!</p>}
            </div>

            <div className="submit-modal-footer">
              <button className="btn-cancel" onClick={() => setSubmitModal(null)}>Cancel</button>
              <button className="btn-confirm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentsPage;
