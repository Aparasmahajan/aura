import React, { useState } from 'react';
import { apiClient } from '../utils/api';

interface CreateContentModalProps {
  folderId: number;
  onClose: () => void;
  onCreated: () => void;
}

const CreateContentModal: React.FC<CreateContentModalProps> = ({ folderId, onClose, onCreated }) => {
  const [type, setType] = useState('VIDEO');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [textContent, setTextContent] = useState<string | ''>('');
  const [mimeType, setMimeType] = useState('VIDEO');
  const [duration, setDuration] = useState<string | ''>('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [resolution, setResolution] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = {
      folderId,
      type,
      title,
      description: description || undefined,
      fileUrl: fileUrl || undefined,
      textContent: textContent === '' ? undefined : textContent,
      mimeType,
      duration: duration === '' ? undefined : duration,
      pageCount: pageCount === '' ? undefined : Number(pageCount),
      resolution: resolution || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    };

    const res = await apiClient.createContent(payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onCreated();
    onClose();
  };

  // Keep mimeType in sync with type and hide the field from UI
  const handleTypeChange = (newType: string) => {
    setType(newType);
    setMimeType(newType);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Content</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Type
            <select value={type} onChange={(e) => handleTypeChange(e.target.value)} required>
              <option value="VIDEO">VIDEO</option>
              <option value="AUDIO">AUDIO</option>
              <option value="PDF">PDF</option>
              <option value="BLOG">BLOG</option>
            </select>
          </label>

          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            type="text"
            placeholder="File URL"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />

          <textarea
            placeholder="Text Content"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
          />

          {/* MIME Type follows Type automatically; hidden from UI */}

          <input
            type="text"
            placeholder="Duration (HH:MM:SS)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />

          <input
            type="number"
            placeholder="Page Count"
            value={pageCount}
            onChange={(e) => setPageCount(e.target.value === '' ? '' : Number(e.target.value))}
            min={0}
          />

          <input
            type="text"
            placeholder="Resolution (e.g., 1920x1080)"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />

          <input
            type="text"
            placeholder="Thumbnail URL"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Content'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateContentModal;


