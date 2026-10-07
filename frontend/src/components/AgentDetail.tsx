'use client';

import type { Agent } from '@/types/agent';
import { X, Trash2, Pencil, Star, Package, MapPin, Phone, Mail, Calendar } from 'lucide-react';

interface AgentDetailProps {
  agent: Agent;
  fromCache: boolean;
  onClose: () => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

const VEHICLE_LABELS: Record<string, string> = {
  bike: '🏍️ Bike',
  scooter: '🛵 Scooter',
  cycle: '🚲 Cycle',
  car: '🚗 Car',
  van: '🚐 Van',
};

export default function AgentDetail({ agent, fromCache, onClose, onEdit, onDelete }: AgentDetailProps) {
  const initials = agent.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <>
      <div className="modal-header">
        <div>
          <div className="modal-title">Agent Profile</div>
          <div className="modal-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>ID: </span>
            <code style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{agent.id}</code>

          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="modal-body detail-modal">
        {/* Header Card */}
        <div className="detail-header-card">
          <div className="detail-avatar">{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="detail-name">{agent.full_name}</div>
            <div className="detail-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span className={`badge badge-${agent.status}`}>
                <span className="badge-dot" />
                {STATUS_LABELS[agent.status]}
              </span>
              <span className="badge badge-vehicle">{VEHICLE_LABELS[agent.vehicle_type] || agent.vehicle_type}</span>
              <span className="rating">
                <Star size={12} fill="var(--yellow)" />
                {Number(agent.rating).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Area */}
        <div className="detail-section-title">Contact Details</div>
        <div className="detail-grid" style={{ marginBottom: 16 }}>
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={10} /> Phone
            </div>
            <div className="detail-field-value">{agent.phone}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={10} /> Email
            </div>
            <div className="detail-field-value" style={{ fontSize: 12.5, wordBreak: 'break-word' }}>{agent.email}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={10} /> Service Area
            </div>
            <div className="detail-field-value">{agent.service_area}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Package size={10} /> Total Deliveries
            </div>
            <div className="detail-field-value">{agent.total_deliveries.toLocaleString()}</div>
          </div>
        </div>

        {/* Notes */}
        {agent.notes && (
          <>
            <div className="detail-section-title">Notes</div>
            <div
              className="detail-field"
              style={{ marginBottom: 16, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}
            >
              {agent.notes}
            </div>
          </>
        )}

        {/* Timestamps */}
        <div className="detail-section-title">Timestamps</div>
        <div className="detail-grid">
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} /> Created
            </div>
            <div className="detail-field-value" style={{ fontSize: 12.5 }}>{formatDate(agent.created_at)}</div>
          </div>
          <div className="detail-field">
            <div className="detail-field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} /> Last Updated
            </div>
            <div className="detail-field-value" style={{ fontSize: 12.5 }}>{formatDate(agent.updated_at)}</div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(agent)} id="detail-delete-btn">
          <Trash2 size={14} /> Delete
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary btn-sm" onClick={() => onEdit(agent)} id="detail-edit-btn">
          <Pencil size={14} /> Edit Agent
        </button>
      </div>
    </>
  );
}
