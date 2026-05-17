import React, { useState } from 'react';
import { apiClient } from '../utils/api';
import { Film, Music, FileText, BookOpen, Link, Clock, Hash, Monitor, Image, X, AlertCircle } from 'lucide-react';
import './CreateContentModal.scss';

interface CreateContentModalProps {
  folderId: number;
  onClose: () => void;
  onCreated: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  VIDEO: { icon: <Film size={16} />, label: 'Video',  color: '#8b5cf6' },
  AUDIO: { icon: <Music size={16} />, label: 'Audio',  color: '#0ea5e9' },
  PDF:   { icon: <FileText size={16} />, label: 'PDF',  color: '#ef4444' },
  BLOG:  { icon: <BookOpen size={16} />, label: 'Blog / Text',  color: '#10b981' },
};

const CreateContentModal: React.FC<CreateContentModalProps> = ({ folderId, onClose, onCreated }) => {
  const [type, setType] = useState('VIDEO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [duration, setDuration] = useState('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [resolution, setResolution] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (newType: string) => {
    setType(newType);
    // reset type-specific fields on switch
    setDuration('');
    setPageCount('');
    setResolution('');
    setThumbnailUrl('');
    setTextContent('');
    setFileUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload: any = {
      folderId,
      type,
      title,
      mimeType: type,
      description: description || undefined,
      fileUrl: fileUrl || undefined,
      textContent: textContent || undefined,
      duration: duration || undefined,
      pageCount: pageCount === '' ? undefined : Number(pageCount),
      resolution: resolution || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    };
    const res = await apiClient.createContent(payload);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    onCreated();
    onClose();
  };

  const cfg = TYPE_CONFIG[type];

  return (
    <div className="ccm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ccm-modal">

        {/* Header */}
        <div className="ccm-header">
          <div className="ccm-title-row">
            <div className="ccm-type-icon" style={{ background: cfg.color }}>{cfg.icon}</div>
            <h3>Add Content</h3>
          </div>
          <button className="ccm-close" type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ccm-body">

            {/* Type selector */}
            <div className="ccm-type-tabs">
              {Object.entries(TYPE_CONFIG).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  className={`ccm-type-tab${type === key ? ' active' : ''}`}
                  style={type === key ? { borderColor: c.color, color: c.color, background: `${c.color}12` } : {}}
                  onClick={() => handleTypeChange(key)}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Common fields */}
            <div className="ccm-field">
              <label>Title <span className="req">*</span></label>
              <input
                required
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`Enter ${cfg.label.toLowerCase()} title`}
              />
            </div>

            <div className="ccm-field">
              <label>Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description (optional)"
              />
            </div>

            {/* File URL — for everything except BLOG */}
            {type !== 'BLOG' && (
              <div className="ccm-field">
                <label><Link size={13} /> File URL <span className="req">*</span></label>
                <input
                  required
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            )}

            {/* Text Content — BLOG only */}
            {type === 'BLOG' && (
              <div className="ccm-field">
                <label><BookOpen size={13} /> Content <span className="req">*</span></label>
                <textarea
                  required
                  rows={6}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Write your blog / text content here…"
                />
              </div>
            )}

            {/* Type-specific metadata */}
            <div className="ccm-meta-grid">
              {(type === 'VIDEO' || type === 'AUDIO') && (
                <div className="ccm-field">
                  <label><Clock size={13} /> Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="HH:MM:SS"
                  />
                </div>
              )}

              {type === 'PDF' && (
                <div className="ccm-field">
                  <label><Hash size={13} /> Page Count</label>
                  <input
                    type="number"
                    min={1}
                    value={pageCount}
                    onChange={e => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 24"
                  />
                </div>
              )}

              {type === 'VIDEO' && (
                <div className="ccm-field">
                  <label><Monitor size={13} /> Resolution</label>
                  <input
                    type="text"
                    value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    placeholder="e.g. 1920x1080"
                  />
                </div>
              )}

              {(type === 'VIDEO' || type === 'AUDIO') && (
                <div className="ccm-field">
                  <label><Image size={13} /> Thumbnail URL</label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={e => setThumbnailUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="ccm-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div className="ccm-footer">
            <button type="button" className="ccm-btn-cancel" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="ccm-btn-submit"
              style={{ background: cfg.color }}
              disabled={submitting}
            >
              {submitting ? 'Adding…' : `Add ${cfg.label}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContentModal;
