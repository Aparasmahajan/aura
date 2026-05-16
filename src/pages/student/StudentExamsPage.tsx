import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { GraduationCap, ExternalLink, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import './StudentExamsPage.scss';

interface FolderExam {
  id: string;
  folderId: string;
  folderName: string;
  examCode: string;
  examTitle: string;
  availableFrom?: string;
  availableUntil?: string;
  instructions?: string;
}

const StudentExamsPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user } = useAuth();
  const { folders } = usePortal();

  const [exams, setExams] = useState<FolderExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // enrolled folders
  const enrolledFolderIds = folders.filter(f => f.canView || f.isUniversal).map(f => f.id);

  useEffect(() => {
    loadExams();
  }, [folders]);

  const loadExams = async () => {
    if (enrolledFolderIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    const results: FolderExam[] = [];

    await Promise.all(
      enrolledFolderIds.map(async fid => {
        const res = await apiClient.getFolderExams(fid);
        if (res.data) {
          const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          const folderName = folders.find(f => f.id === fid)?.name ?? '';
          items.forEach((e: any) => results.push({ ...e, folderId: fid, folderName }));
        }
      })
    );

    setExams(results);
    setLoading(false);
  };

  const handleStartExam = async (exam: FolderExam) => {
    if (!user?.id) return;
    setStartingId(exam.id);
    setError('');

    const res = await apiClient.generateExamLink({
      examId:          exam.id,
      userName:        user.fullName ?? user.username ?? 'Student',
      userEmail:       user.email ?? '',
      validForMinutes: 180,
    });

    setStartingId(null);

    if (res.error || !res.data?.link) {
      setError(res.error || 'Failed to generate exam link. Try again.');
      return;
    }

    // Navigate within Aura — exam page reads the ?usr= token
    window.location.href = res.data.link;
  };

  const examStatus = (exam: FolderExam): 'upcoming' | 'open' | 'closed' => {
    const now = Date.now();
    if (exam.availableFrom && new Date(exam.availableFrom).getTime() > now) return 'upcoming';
    if (exam.availableUntil && new Date(exam.availableUntil).getTime() < now) return 'closed';
    return 'open';
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="student-exams">
      <div className="page-header">
        <h1>Exams</h1>
        <p>Exams assigned to your enrolled folders</p>
      </div>

      {error && <div className="error-banner"><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <div className="spinner-center"><div className="spinner" /></div>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <GraduationCap size={48} />
          <p>No exams assigned yet</p>
        </div>
      ) : (
        <div className="exams-list">
          {exams.map(exam => {
            const status = examStatus(exam);
            return (
              <div key={exam.id} className={`exam-card exam-${status}`}>
                <div className="exam-card-top">
                  <div>
                    <h3>{exam.examTitle}</h3>
                    <p className="exam-folder-tag">{exam.folderName}</p>
                  </div>
                  <span className={`badge badge-${status === 'open' ? 'green' : status === 'upcoming' ? 'yellow' : 'gray'}`}>
                    {status === 'open' ? 'Open' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
                  </span>
                </div>

                {exam.instructions && (
                  <p className="exam-instructions">{exam.instructions}</p>
                )}

                <div className="exam-dates">
                  {exam.availableFrom && (
                    <span><Clock size={12} /> From: {formatDate(exam.availableFrom)}</span>
                  )}
                  {exam.availableUntil && (
                    <span><Clock size={12} /> Until: {formatDate(exam.availableUntil)}</span>
                  )}
                </div>

                <div className="exam-card-footer">
                  <button
                    className={`btn-start-exam${status !== 'open' ? ' disabled' : ''}`}
                    disabled={status !== 'open' || startingId === exam.id}
                    onClick={() => handleStartExam(exam)}
                  >
                    {startingId === exam.id ? (
                      'Generating link...'
                    ) : status === 'open' ? (
                      <><ExternalLink size={15} /> Start Exam</>
                    ) : status === 'upcoming' ? (
                      'Not yet open'
                    ) : (
                      <><CheckCircle size={15} /> Closed</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentExamsPage;
