'use client';

import { useState } from 'react';
import type { Agent, AgentFormData, AgentStatus, VehicleType } from '@/types/agent';
import { X, AlertCircle } from 'lucide-react';

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'bike', label: '🏍️ Bike' },
  { value: 'scooter', label: '🛵 Scooter' },
  { value: 'cycle', label: '🚲 Cycle' },
  { value: 'car', label: '🚗 Car' },
  { value: 'van', label: '🚐 Van' },
];

const STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
];

export default function AgentForm({ agent, onSubmit, onClose, isLoading }: AgentFormProps) {
  const isEdit = !!agent;

  const [formData, setFormData] = useState<AgentFormData>({
    full_name: agent?.full_name ?? '',
    phone: agent?.phone ?? '',
    email: agent?.email ?? '',
    service_area: agent?.service_area ?? '',
    status: agent?.status ?? 'active',
    vehicle_type: agent?.vehicle_type ?? 'bike',
    rating: agent?.rating ?? 5,
    total_deliveries: agent?.total_deliveries ?? 0,
    notes: agent?.notes ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof AgentFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.full_name.trim()) errs.full_name = 'Full name is required';
    if (!formData.phone.trim()) errs.phone = 'Phone is required';
    if (!formData.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email address';
    if (!formData.service_area.trim()) errs.service_area = 'Service area is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      ...formData,
      rating: Number(formData.rating),
      total_deliveries: Number(formData.total_deliveries),
    });
  };

  return (
    <>
      <div className="modal-header">
        <div>
          <div className="modal-title">{isEdit ? 'Edit Agent' : 'Add New Agent'}</div>
          <div className="modal-subtitle">
            {isEdit ? `Updating record for ${agent?.full_name}` : 'Fill in the details to create a new delivery agent'}
          </div>
        </div>
        <button className="close-btn" onClick={onClose} type="button">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <div className="form-grid">
            {/* Full Name */}
            <div className="form-group full">
              <label className="form-label">Full Name *</label>
              <input
                id="agent-full-name"
                className="form-input"
                placeholder="e.g. Rahul Sharma"
                value={formData.full_name}
                onChange={set('full_name')}
              />
              {errors.full_name && (
                <span className="form-error"><AlertCircle size={12} />{errors.full_name}</span>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                id="agent-phone"
                className="form-input"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={set('phone')}
              />
              {errors.phone && (
                <span className="form-error"><AlertCircle size={12} />{errors.phone}</span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                id="agent-email"
                className="form-input"
                type="email"
                placeholder="rahul@example.com"
                value={formData.email}
                onChange={set('email')}
              />
              {errors.email && (
                <span className="form-error"><AlertCircle size={12} />{errors.email}</span>
              )}
            </div>

            {/* Service Area */}
            <div className="form-group full">
              <label className="form-label">Service Area *</label>
              <input
                id="agent-service-area"
                className="form-input"
                placeholder="e.g. Bangalore North"
                value={formData.service_area}
                onChange={set('service_area')}
              />
              {errors.service_area && (
                <span className="form-error"><AlertCircle size={12} />{errors.service_area}</span>
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status</label>
              <select id="agent-status" className="form-select" value={formData.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Type */}
            <div className="form-group">
              <label className="form-label">Vehicle Type</label>
              <select id="agent-vehicle" className="form-select" value={formData.vehicle_type} onChange={set('vehicle_type')}>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div className="form-group">
              <label className="form-label">Rating (0–5)</label>
              <input
                id="agent-rating"
                className="form-input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={set('rating')}
              />
            </div>

            {/* Total Deliveries */}
            <div className="form-group">
              <label className="form-label">Total Deliveries</label>
              <input
                id="agent-deliveries"
                className="form-input"
                type="number"
                min="0"
                value={formData.total_deliveries}
                onChange={set('total_deliveries')}
              />
            </div>

            {/* Notes */}
            <div className="form-group full">
              <label className="form-label">Notes</label>
              <textarea
                id="agent-notes"
                className="form-textarea"
                placeholder="Any additional notes..."
                value={formData.notes ?? ''}
                onChange={set('notes')}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" id="agent-form-submit" disabled={isLoading}>
            {isLoading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Agent')}
          </button>
        </div>
      </form>
    </>
  );
}
