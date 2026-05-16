import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../utils/api';
import { User, Save, AlertCircle } from 'lucide-react';
import './StudentProfilePage.scss';

interface Profile {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  enrollmentNo: string;
  course: string;
  yearSemester: string;
}

const EMPTY: Profile = {
  fullName: '', phone: '', dateOfBirth: '', gender: '', address: '',
  enrollmentNo: '', course: '', yearSemester: '',
};

const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    const res = await apiClient.getUserProfile(user!.id);
    setLoading(false);
    if (res.data) {
      const d = res.data?.data ?? res.data;
      setProfile({
        fullName: d.fullName ?? d.full_name ?? '',
        phone: d.phone ?? '',
        dateOfBirth: d.dateOfBirth ?? d.date_of_birth ?? '',
        gender: d.gender ?? '',
        address: d.address ?? '',
        enrollmentNo: d.enrollmentNo ?? d.enrollment_no ?? '',
        course: d.course ?? '',
        yearSemester: d.yearSemester ?? d.year_semester ?? '',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError('');
    const res = await apiClient.updateUserProfile(user!.id, profile);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const field = (label: string, key: keyof Profile, type = 'text') => (
    <div className="profile-field">
      <label>{label}</label>
      <input
        type={type}
        value={profile[key]}
        onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
        placeholder={label}
      />
    </div>
  );

  return (
    <div className="student-profile">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Update your personal and academic information</p>
      </div>

      <div className="profile-card">
        <div className="profile-avatar-row">
          <div className="big-avatar">{(user?.username?.[0] ?? 'S').toUpperCase()}</div>
          <div>
            <h2>{profile.fullName || user?.username}</h2>
            <p>{user?.email}</p>
            <span className="badge badge-blue">Student</span>
          </div>
        </div>

        {loading ? (
          <div className="spinner-center"><div className="spinner" /></div>
        ) : (
          <>
            <h3 className="section-label">Personal Information</h3>
            <div className="profile-grid">
              {field('Full Name', 'fullName')}
              {field('Phone', 'phone', 'tel')}
              {field('Date of Birth', 'dateOfBirth', 'date')}
              <div className="profile-field">
                <label>Gender</label>
                <select
                  value={profile.gender}
                  onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="profile-field full-width">
              <label>Address</label>
              <textarea
                rows={2}
                value={profile.address}
                onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                placeholder="Your address"
              />
            </div>

            <h3 className="section-label">Academic Information</h3>
            <div className="profile-grid">
              {field('Enrollment No.', 'enrollmentNo')}
              {field('Course / Program', 'course')}
              {field('Year / Semester', 'yearSemester')}
            </div>

            {error && (
              <div className="profile-error"><AlertCircle size={14} /> {error}</div>
            )}
            {success && (
              <div className="profile-success">Profile saved successfully!</div>
            )}

            <div className="profile-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentProfilePage;
