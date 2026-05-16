import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePortal } from '../../contexts/PortalContext';
import { apiClient } from '../../utils/api';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import './StudentFeesPage.scss';

interface FeeRecord {
  id: string;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  dueDate?: string;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentNotes?: string;
  updatedAt: string;
}

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    icon: <CheckCircle size={14} />, cls: 'badge-green' },
  partial: { label: 'Partial', icon: <Clock size={14} />,       cls: 'badge-yellow' },
  pending: { label: 'Pending', icon: <Clock size={14} />,       cls: 'badge-blue' },
  overdue: { label: 'Overdue', icon: <AlertCircle size={14} />, cls: 'badge-red' },
};

const StudentFeesPage: React.FC = () => {
  const { user } = useAuth();
  const { portal } = usePortal();

  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    loadFees();
  }, [user?.id]);

  const loadFees = async () => {
    setLoading(true);
    const res = await apiClient.getStudentFees(user!.id);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    items.sort((a: FeeRecord, b: FeeRecord) => b.academicYear.localeCompare(a.academicYear));
    setFees(items);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="student-fees">
      <div className="page-header">
        <h1>Fee Payment</h1>
        <p>Your fee records for {portal?.display_name}</p>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <div className="spinner-center"><div className="spinner" /></div>
      ) : fees.length === 0 ? (
        <div className="empty-state">
          <CreditCard size={48} />
          <p>No fee records found. Contact the administration.</p>
        </div>
      ) : (
        <div className="fees-list">
          {fees.map(fee => {
            const remaining = fee.totalAmount - fee.paidAmount;
            const cfg = STATUS_CONFIG[fee.paymentStatus] ?? STATUS_CONFIG.pending;
            return (
              <div key={fee.id} className={`fee-card status-${fee.paymentStatus}`}>
                <div className="fee-card-top">
                  <div>
                    <h3>Academic Year {fee.academicYear}</h3>
                    {fee.dueDate && (
                      <p className="fee-due">Due: {formatDate(fee.dueDate)}</p>
                    )}
                  </div>
                  <span className={`badge ${cfg.cls}`}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                <div className="fee-amounts">
                  <div className="fee-amount-block">
                    <span className="label">Total Fee</span>
                    <span className="amount">{fmt(fee.totalAmount)}</span>
                  </div>
                  <div className="fee-amount-block">
                    <span className="label">Paid</span>
                    <span className="amount paid">{fmt(fee.paidAmount)}</span>
                  </div>
                  <div className="fee-amount-block">
                    <span className="label">Remaining</span>
                    <span className={`amount${remaining > 0 ? ' due' : ''}`}>{fmt(remaining)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="fee-progress">
                  <div
                    className="fee-progress-fill"
                    style={{ width: `${Math.min(100, (fee.paidAmount / fee.totalAmount) * 100)}%` }}
                  />
                </div>
                <p className="fee-pct">
                  {Math.round((fee.paidAmount / fee.totalAmount) * 100)}% paid
                </p>

                {fee.paymentNotes && (
                  <div className="fee-notes">
                    <AlertCircle size={14} />
                    <span>{fee.paymentNotes}</span>
                  </div>
                )}

                <p className="fee-updated">Last updated: {formatDate(fee.updatedAt)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentFeesPage;
