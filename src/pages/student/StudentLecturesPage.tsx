import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { Folder, BookOpen, ChevronRight } from 'lucide-react';
import './StudentLecturesPage.scss';

interface FolderRow {
  id: string;
  name: string;
  description: string;
}

interface ProgressMap {
  [contentId: string]: { percentWatched: number; completed: boolean };
}

const StudentLecturesPage: React.FC = () => {
  const { portalName } = useParams<{ portalName: string }>();
  const { user } = useAuth();
  const { portal } = usePortal();
  const navigate = useNavigate();

  const [enrolledFolders, setEnrolledFolders] = useState<FolderRow[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    if (portal?.id) loadFolders();
  }, [portal?.id]);

  useEffect(() => {
    if (user?.id) loadProgress();
  }, [user?.id]);

  const loadFolders = async () => {
    if (!portal?.id) return;
    setLoadingFolders(true);
    const res = await apiClient.getPortalFolders(portal.id);
    setLoadingFolders(false);
    if (res.data) {
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw) ? raw : [];
      setEnrolledFolders(arr.map((f: any) => ({
        id: String(f.folderId ?? f.id),
        name: f.name,
        description: f.description ?? '',
      })));
    }
  };

  const loadProgress = async () => {
    if (!user?.id) return;
    const res = await apiClient.getVideoProgress(user.id);
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

      {loadingFolders ? (
        <div className="empty-state"><div className="spinner-small" /></div>
      ) : enrolledFolders.length === 0 ? (
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
