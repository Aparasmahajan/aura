import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import { ArrowLeft, Folder, Play, CheckCircle, BookOpen, FileText, Music } from 'lucide-react';
import VideoPlayer from '../../components/VideoPlayer';
import AudioPlayer from '../../components/AudioPlayer';
import PDFViewer from '../../components/PDFViewer';
import BlogContent from '../../components/BlogContent';
import './StudentFolderViewPage.scss';

interface ContentItem {
  contentId: number;
  type: string;
  title: string;
  description?: string;
  fileUrl?: string;
  textContent?: string;
  mediaMetadata?: { duration?: string; pageCount?: number; thumbnailUrl?: string; mimeType?: string; resolution?: string };
}

interface FolderDetails {
  folderId: number;
  name: string;
  description?: string;
  subFolders: FolderDetails[];
  contents: ContentItem[];
}

interface ProgressMap {
  [contentId: string]: { percentWatched: number; completed: boolean; watchedSeconds: number };
}

const PROGRESS_SYNC_INTERVAL = 10_000; // 10 seconds

const StudentFolderViewPage: React.FC = () => {
  const { folderId, portalName } = useParams<{ folderId: string; portalName: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [folder, setFolder] = useState<FolderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressSyncRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentContentIdRef = useRef<string | null>(null);
  const totalSecondsRef = useRef<number>(0);

  useEffect(() => {
    fetchFolder();
    fetchProgress();
  }, [folderId]);

  const fetchFolder = async () => {
    setLoading(true);
    const res = await apiClient.getFolderDetails(Number(folderId));
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setFolder(res.data?.data ?? res.data);
  };

  const fetchProgress = async () => {
    if (!user?.id || !folderId) return;
    const res = await apiClient.getVideoProgress(user.id, folderId);
    if (res.data) {
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      const map: ProgressMap = {};
      items.forEach((p: any) => {
        map[String(p.contentId)] = {
          percentWatched: p.percentWatched,
          completed: p.completed,
          watchedSeconds: p.watchedSeconds,
        };
      });
      setProgress(map);
    }
  };

  const syncProgress = useCallback(async (contentId: string, watchedSeconds: number, totalSec: number) => {
    if (!user?.id || !folderId) return;
    await apiClient.upsertVideoProgress({
      studentId: user.id,
      contentId,
      folderId,
      watchedSeconds: Math.floor(watchedSeconds),
      totalSeconds: Math.floor(totalSec),
    });
    const pct = totalSec > 0 ? Math.min(100, (watchedSeconds / totalSec) * 100) : 0;
    setProgress(prev => ({
      ...prev,
      [contentId]: {
        percentWatched: pct,
        completed: pct >= 90,
        watchedSeconds: Math.floor(watchedSeconds),
      },
    }));
  }, [user?.id, folderId]);

  const handleSelectContent = (content: ContentItem) => {
    // stop previous sync
    if (progressSyncRef.current) clearInterval(progressSyncRef.current);
    setSelected(content);
    currentContentIdRef.current = String(content.contentId);

    if (content.type.toUpperCase() === 'VIDEO') {
      // parse duration HH:MM:SS → seconds
      const dur = content.mediaMetadata?.duration ?? '0';
      const parts = dur.split(':').map(Number);
      totalSecondsRef.current = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];

      // periodic sync every 10s
      progressSyncRef.current = setInterval(() => {
        const vid = videoRef.current;
        if (vid && currentContentIdRef.current) {
          syncProgress(currentContentIdRef.current, vid.currentTime, totalSecondsRef.current || vid.duration || 1);
        }
      }, PROGRESS_SYNC_INTERVAL);
    }
  };

  useEffect(() => {
    return () => {
      if (progressSyncRef.current) clearInterval(progressSyncRef.current);
    };
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'VIDEO': return <Play size={16} />;
      case 'AUDIO': return <Music size={16} />;
      case 'PDF':   return <FileText size={16} />;
      default:      return <BookOpen size={16} />;
    }
  };

  const renderPlayer = () => {
    if (!selected) return null;
    switch (selected.type.toUpperCase()) {
      case 'VIDEO':
        return (
          <VideoPlayer
            src={selected.fileUrl || ''}
            title={selected.title}
            description={selected.description}
            thumbnailUrl={selected.mediaMetadata?.thumbnailUrl}
            duration={selected.mediaMetadata?.duration}
            resolution={selected.mediaMetadata?.resolution}
          />
        );
      case 'AUDIO':
        return (
          <AudioPlayer
            src={selected.fileUrl || ''}
            title={selected.title}
            description={selected.description}
            duration={selected.mediaMetadata?.duration}
            mimeType={selected.mediaMetadata?.mimeType}
          />
        );
      case 'PDF':
        return (
          <PDFViewer
            src={selected.fileUrl || ''}
            title={selected.title}
            description={selected.description}
            pageCount={selected.mediaMetadata?.pageCount}
          />
        );
      case 'BLOG':
      case 'TEXT':
        return (
          <BlogContent
            title={selected.title}
            description={selected.description}
            textContent={selected.textContent}
          />
        );
      default:
        return (
          <div style={{ padding: 24 }}>
            <p>Content type not supported. <a href={selected.fileUrl} target="_blank" rel="noreferrer">Open externally</a></p>
          </div>
        );
    }
  };

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;
  if (error) return <p style={{ color: '#ef4444', padding: 24 }}>{error}</p>;
  if (!folder) return null;

  const allContents = folder.contents ?? [];

  return (
    <div className="student-folder-view">
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="folder-view-body">
        {/* Content list sidebar */}
        <aside className="content-list">
          <h2>{folder.name}</h2>
          {folder.description && <p className="folder-desc">{folder.description}</p>}

          {folder.subFolders?.length > 0 && (
            <div className="sub-section">
              <h4>Subfolders</h4>
              {folder.subFolders.map(sf => (
                <div
                  key={sf.folderId}
                  className="sub-folder-row"
                  onClick={() => navigate(`/${portalName}/student/folder/${sf.folderId}`)}
                >
                  <Folder size={15} />
                  <span>{sf.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="sub-section">
            <h4>Content ({allContents.length})</h4>
            {allContents.length === 0 ? (
              <p className="no-content">No content in this folder</p>
            ) : (
              allContents.map(c => {
                const prog = progress[String(c.contentId)];
                const pct = prog?.percentWatched ?? 0;
                const done = prog?.completed ?? false;
                return (
                  <div
                    key={c.contentId}
                    className={`content-row${selected?.contentId === c.contentId ? ' active' : ''}`}
                    onClick={() => handleSelectContent(c)}
                  >
                    <span className="content-type-icon">{getTypeIcon(c.type)}</span>
                    <div className="content-row-info">
                      <span className="content-row-title">{c.title}</span>
                      {c.type.toUpperCase() === 'VIDEO' && (
                        <div className="mini-progress">
                          <div className="mini-bar" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {done && <CheckCircle size={14} className="done-icon" />}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Player area */}
        <div className="player-area">
          {selected ? (
            <>
              <div className="player-wrap">{renderPlayer()}</div>
              {selected.type.toUpperCase() === 'VIDEO' && progress[String(selected.contentId)] && (
                <div className="progress-info">
                  <span>
                    {Math.round(progress[String(selected.contentId)]?.percentWatched ?? 0)}% watched
                    {progress[String(selected.contentId)]?.completed && ' · Completed ✓'}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <Play size={48} />
              <p>Select a lecture from the list to start watching</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFolderViewPage;
