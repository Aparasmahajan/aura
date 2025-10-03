import React, { useState } from 'react';
import { apiClient } from '../utils/api';
import { FolderPlus } from 'lucide-react';
import './CreateFolderModal.scss';

interface EmailItem {
  email: string;
  userId: number | null;
  loading: boolean;
  error?: string;
}

interface CreateFolderModalProps {
  portalName: string;
  parentFolderId?: number;
  onClose: () => void;
  onCreated: () => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ portalName, parentFolderId, onClose, onCreated }) => {
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    isUniversal: false,
    price: '',
    accessDurationInDays: '',
  });
  const [emails, setEmails] = useState<EmailItem[]>([{ email: '', userId: null, loading: false }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userIds: number[] = emails.filter(e => e.userId).map(e => e.userId!) ;

      const folderData: any = {
        portalName,
        name: createForm.name,
        description: createForm.description,
        isUniversal: createForm.isUniversal,
        price: createForm.price ? parseFloat(createForm.price) : undefined,
        accessDurationInDays: createForm.accessDurationInDays ? parseInt(createForm.accessDurationInDays) : undefined,
        parentFolderId,
        userIds,
      };

      const res: any = await apiClient.createFolder(folderData);

      if (res.status === 'FAILURE') {
        setError(res.message || 'Failed to create folder');
      } else {
        onCreated();
        onClose();
        setCreateForm({ name: '', description: '', isUniversal: false, price: '', accessDurationInDays: '' });
        setEmails([{ email: '', userId: null, loading: false }]);
      }
    } catch {
      setError('Failed to create folder');
    }
    setLoading(false);
  };

  const handleEmailBlur = async (index: number) => {
    const item = emails[index];
    if (!item.email || item.userId || item.loading) return;

    const newEmails = [...emails];
    newEmails[index].loading = true;
    setEmails(newEmails);

    try {
      const res = await apiClient.getUserByEmail(item.email);
      newEmails[index].loading = false;
      if (res?.data) newEmails[index].userId = res.data;
      else newEmails[index].error = 'User does not exist';
    } catch {
      newEmails[index].error = 'User does not exist';
      newEmails[index].userId = null;
      newEmails[index].loading = false;
    }
    setEmails(newEmails);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create Folder</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <textarea
            placeholder="Description"
            value={createForm.description}
            onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
          />
          <label>
            <input
              type="checkbox"
              checked={createForm.isUniversal}
              onChange={e => setCreateForm(f => ({ ...f, isUniversal: e.target.checked }))}
            /> Universal
          </label>
          <input
            type="number"
            placeholder="Price"
            value={createForm.price}
            onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
          />
          <input
            type="number"
            placeholder="Access Duration (days)"
            value={createForm.accessDurationInDays}
            onChange={e => setCreateForm(f => ({ ...f, accessDurationInDays: e.target.value }))}
          />

          <div className="emails-inputs">
            {emails.map((item, index) => (
              <div key={index} className="email-row">
                <input
                  type="email"
                  placeholder="User Email"
                  value={item.email}
                  onChange={e => {
                    const newEmails = [...emails];
                    newEmails[index].email = e.target.value;
                    newEmails[index].userId = null;
                    newEmails[index].error = '';
                    setEmails(newEmails);
                  }}
                  onBlur={() => handleEmailBlur(index)}
                  disabled={item.userId !== null}
                />
                {item.loading && <span className="loading-spinner">⏳</span>}
                {item.error && <span className="error-message">{item.error}</span>}
                {emails.length > 1 && <button type="button" onClick={() => setEmails(emails.filter((_, i) => i !== index))}>Remove</button>}
              </div>
            ))}
            {emails[emails.length - 1]?.error === '' && (
              <button type="button" onClick={() => setEmails([...emails, { email: '', userId: null, loading: false }])}>
                Add Another Email
              </button>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          {error && <div className="error-message">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;
