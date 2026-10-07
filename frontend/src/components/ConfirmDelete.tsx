'use client';

import type { Agent } from '@/types/agent';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteProps {
  agent: Agent;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ConfirmDelete({ agent, onConfirm, onCancel, isLoading }: ConfirmDeleteProps) {
  return (
    <>
      <div className="modal-header">
        <div className="modal-title">Confirm Deletion</div>
        <button className="close-btn" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div className="confirm-icon" style={{ margin: '0 auto 16px' }}>
          <AlertTriangle size={24} />
        </div>
        <div className="confirm-title">Delete Agent?</div>
        <p className="confirm-text">
          You are about to permanently delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{agent.full_name}</strong>.
          This action cannot be undone.
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel} disabled={isLoading} id="confirm-cancel-btn">
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={isLoading} id="confirm-delete-btn">
          {isLoading ? 'Deleting...' : 'Yes, Delete Agent'}
        </button>
      </div>
    </>
  );
}
