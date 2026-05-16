import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { Folder, BookOpen, CheckCircle, ChevronRight } from 'lucide-react';
import './StudentLecturesPage.scss';

interface FolderRow {
  id: string;
  name: string;
  description: string;
  contentCount?: number;
}

interface ProgressMap {
  [contentId: string]: { percentWatched: number; completed: boolean };
}

const StudentLecturesPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user } = useAuth();
  const { portal, folders } = usePortal();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<ProgressMap>({});
  const [loadingProgress, setLoadingProgress] = useState(false);

  // enrolled folders = folders the student has canView access to
  const enrolledFolders: FolderRow[] = folders
    .filter(f => f.canView || f.isUniversal)
    .map(f => ({ id: f.id, name: f.name, description: f.description }));

  useEffect(() => {
    if (!user?.id) return;
    loadProgress();
  }, [user?.id]);

  const loadProgress = async () => {
    if (!user?.id) return;
    setLoadingProgress(true);
    const res = await apiClient.getVideoProgress(user.id);
    setLoadingProgress(false);
    if (res.data) {
      const map: ProgressMap = {};
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      items.forEach((p: any) => {
        map[p.contentId] = { percentWatched: p.percentWatched, completed: p.completed };
      });
      setProgress(map);
    }
  };

  return (
    <div className="student-lectures">
      <div className="page-header">
        <h1>Lectures</h1>
        <p>Browse content from your enrolled folders</p>
      </div>

      {enrolledFolders.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>You haven't been added to any folders yet. Contact your teacher.</p>
        </div>
      ) : (
        <div className="folders-grid-lectures">
          {enrolledFolders.map(folder => (
            <div
              key={folder.id}
              className="lecture-folder-card"
              onClick={() => navigate(`/${portalName}/student/folder/${folder.id}`)}
            >
              <div className="folder-icon-wrap">
                <Folder size={28} />
              </div>
              <div className="folder-info">
                <h3>{folder.name}</h3>
                {folder.description && <p>{folder.description}</p>}
              </div>
              <ChevronRight size={20} className="arrow" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentLecturesPage;
