import React, { useState } from 'react';
import { apiClient } from '../utils/api';
import { FolderPlus, X, Plus, Trash2 } from 'lucide-react';
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
        parentFolderId: parentFolderId !=null ? parentFolderId : null,
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
    <div className="cfm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfm-modal">
        <div className="cfm-header">
          <div className="cfm-header-icon"><FolderPlus size={18} /></div>
          <h3>Create Folder</h3>
          <button className="cfm-close" type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <form className="cfm-body" onSubmit={handleSubmit}>
          <div className="cfm-field">
            <label>Folder Name *</label>
            <input
              type="text"
              placeholder="e.g. Physics — Semester 3"
              value={createForm.name}
              onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div className="cfm-field">
            <label>Description</label>
            <textarea
              rows={2}
              placeholder="Optional description…"
              value={createForm.description}
              onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="cfm-row">
            <div className="cfm-field cfm-field-half">
              <label>Price (₹)</label>
              <input
                type="number"
                placeholder="0"
                value={createForm.price}
                onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="cfm-field cfm-field-half">
              <label>Access Duration (days)</label>
              <input
                type="number"
                placeholder="365"
                value={createForm.accessDurationInDays}
                onChange={e => setCreateForm(f => ({ ...f, accessDurationInDays: e.target.value }))}
              />
            </div>
          </div>

          <label className="cfm-checkbox">
            <input
              type="checkbox"
              checked={createForm.isUniversal}
              onChange={e => setCreateForm(f => ({ ...f, isUniversal: e.target.checked }))}
            />
            <span>Universal (visible to all portal users)</span>
          </label>

          <div className="cfm-field">
            <label>Grant Access (optional)</label>
            <div className="cfm-emails">
              {emails.map((item, index) => (
                <div key={index} className="cfm-email-row">
                  <input
                    type="email"
                    placeholder="student@email.com"
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
                    className={item.userId ? 'resolved' : item.error ? 'has-error' : ''}
                  />
                  {item.loading && <span className="cfm-spinner" />}
                  {item.userId && <span className="cfm-resolved">✓</span>}
                  {emails.length > 1 && (
                    <button type="button" className="cfm-remove-email" onClick={() => setEmails(emails.filter((_, i) => i !== index))}>
                      <Trash2 size={13} />
                    </button>
                  )}
                  {item.error && <p className="cfm-email-error">{item.error}</p>}
                </div>
              ))}
              {emails[emails.length - 1]?.error === '' && (
                <button type="button" className="cfm-add-email" onClick={() => setEmails([...emails, { email: '', userId: null, loading: false }])}>
                  <Plus size={13} /> Add another email
                </button>
              )}
            </div>
          </div>

          {error && <div className="cfm-error">{error}</div>}

          <div className="cfm-footer">
            <button type="button" className="cfm-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="cfm-btn-create" disabled={loading}>
              {loading ? 'Creating…' : <><FolderPlus size={15} /> Create Folder</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFolderModal;
