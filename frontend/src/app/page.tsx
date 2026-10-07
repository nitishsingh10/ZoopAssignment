'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Agent, AgentFormData, StatsResponse } from '@/types/agent';
import { agentApi } from '@/lib/api';
import AgentForm from '@/components/AgentForm';
import AgentDetail from '@/components/AgentDetail';
import ConfirmDelete from '@/components/ConfirmDelete';
import { useToast } from '@/components/Toast';
import {
  Users, UserCheck, UserX, Clock, Search, Plus, Pencil, Trash2,
  Star, MapPin, ChevronLeft, ChevronRight, RefreshCw, LayoutDashboard,
  Bike, Activity, X,
} from 'lucide-react';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; agent: Agent }
  | { type: 'detail'; agent: Agent; fromCache: boolean }
  | { type: 'delete'; agent: Agent };

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'On Leave',
};

const VEHICLE_ICONS: Record<string, string> = {
  bike: '🏍️', scooter: '🛵', cycle: '🚲', car: '🚗', van: '🚐',
};

export default function Home() {
  const { addToast, ToastContainer } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<StatsResponse['stats'] | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  // ── Fetch agents ─────────────────────────────────────────────────────────────
  const fetchAgents = useCallback(async (overrides?: { page?: number; status?: string; search?: string }) => {
    setLoading(true);
    try {
      const res = await agentApi.list({
        page: overrides?.page ?? page,
        limit: 10,
        status: overrides?.status !== undefined ? overrides.status : statusFilter,
        service_area: overrides?.search !== undefined ? overrides.search : search,
      });
      setAgents(res.agents);
      setPagination(res.pagination);
    } catch {
      addToast('error', 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, addToast]);

  // ── Fetch stats ──────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res = await agentApi.stats();
      setStats(res.stats);
    } catch {
      // Stats are optional – ignore errors
    }
  }, []);

  useEffect(() => { fetchAgents(); fetchStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect

  // ── Search debounce ───────────────────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchAgents({ page: 1, search: val });
    }, 400);
  };

  // ── Status filter ─────────────────────────────────────────────────────────────
  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setPage(1);
    fetchAgents({ page: 1, status: val });
  };

  // ── Pagination ─────────────────────────────────────────────────────────────────
  const goToPage = (p: number) => {
    setPage(p);
    fetchAgents({ page: p });
  };

  // ── View agent detail ──────────────────────────────────────────────────────────
  const handleViewAgent = async (id: string) => {
    try {
      const res = await agentApi.get(id);
      setModal({ type: 'detail', agent: res.agent, fromCache: res.fromCache });
    } catch {
      addToast('error', 'Failed to load agent details');
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────────────
  const handleCreate = async (data: AgentFormData) => {
    setActionLoading(true);
    try {
      await agentApi.create(data);
      addToast('success', 'Agent created successfully');
      setModal({ type: 'none' });
      fetchAgents({ page: 1 }); fetchStats();
    } catch (err: unknown) {
      const e = err as { message?: string };
      addToast('error', e.message || 'Failed to create agent');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Update ──────────────────────────────────────────────────────────────────────
  const handleUpdate = async (data: AgentFormData) => {
    if (modal.type !== 'edit') return;
    setActionLoading(true);
    try {
      await agentApi.update(modal.agent.id, data);
      addToast('success', 'Agent updated successfully');
      setModal({ type: 'none' });
      fetchAgents(); fetchStats();
    } catch (err: unknown) {
      const e = err as { message?: string };
      addToast('error', e.message || 'Failed to update agent');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (modal.type !== 'delete') return;
    setActionLoading(true);
    try {
      await agentApi.delete(modal.agent.id);
      addToast('success', `${modal.agent.full_name} deleted`);
      setModal({ type: 'none' });
      fetchAgents({ page: 1 }); fetchStats();
    } catch {
      addToast('error', 'Failed to delete agent');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Initials ────────────────────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Page range ──────────────────────────────────────────────────────────────────
  const getPageRange = () => {
    const range = [];
    const start = Math.max(1, pagination.page - 2);
    const end = Math.min(pagination.pages, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  return (
    <div className="layout">
      {/* ── SIDEBAR ─────────────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">Z</div>
          <div>
            <div className="logo-text">ZoopFleet</div>
            <div className="logo-sub">Agent Manager</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          <button className="nav-item active">
            <LayoutDashboard size={16} className="nav-item-icon" />
            Dashboard
          </button>
          <button className="nav-item" onClick={() => setModal({ type: 'create' })}>
            <Plus size={16} className="nav-item-icon" />
            Add Agent
          </button>

          <div className="nav-label" style={{ marginTop: 8 }}>Quick Filters</div>
          <button className="nav-item" onClick={() => handleStatusFilter('active')}>
            <UserCheck size={16} className="nav-item-icon" />
            Active Agents
          </button>
          <button className="nav-item" onClick={() => handleStatusFilter('inactive')}>
            <UserX size={16} className="nav-item-icon" />
            Inactive Agents
          </button>
          <button className="nav-item" onClick={() => handleStatusFilter('on_leave')}>
            <Clock size={16} className="nav-item-icon" />
            On Leave
          </button>
          <button className="nav-item" onClick={() => { setStatusFilter(''); setSearch(''); setPage(1); fetchAgents({ page: 1, status: '', search: '' }); }}>
            <Users size={16} className="nav-item-icon" />
            All Agents
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-stat">
            <div className="sidebar-stat-label">Total Agents</div>
            <div className="sidebar-stat-value">{stats?.total ?? '—'}</div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────────── */}
      <main className="main">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Delivery Agents</h1>
            <p>Manage your fleet of delivery partners</p>
          </div>
          <div className="topbar-right">

            <button className="btn btn-ghost btn-sm" onClick={() => { fetchAgents(); fetchStats(); }} title="Refresh">
              <RefreshCw size={14} />
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })} id="create-agent-btn">
              <Plus size={15} />
              Add Agent
            </button>
          </div>
        </header>

        <div className="page-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-label">Total Agents</div>
                <div className="stat-icon accent"><Users size={16} /></div>
              </div>
              <div className="stat-value">{stats?.total ?? '—'}</div>
              <div className="stat-sub">{stats?.total_areas ?? '—'} service areas</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-label">Active</div>
                <div className="stat-icon green"><Activity size={16} /></div>
              </div>
              <div className="stat-value" style={{ color: 'var(--green)' }}>{stats?.active ?? '—'}</div>
              <div className="stat-sub">Currently on duty</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-label">Avg. Rating</div>
                <div className="stat-icon yellow"><Star size={16} /></div>
              </div>
              <div className="stat-value" style={{ color: 'var(--yellow)' }}>
                {stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : '—'}
              </div>
              <div className="stat-sub">Fleet average</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-label">Deliveries</div>
                <div className="stat-icon accent"><Bike size={16} /></div>
              </div>
              <div className="stat-value">{stats?.total_deliveries ? Number(stats.total_deliveries).toLocaleString() : '—'}</div>
              <div className="stat-sub">Total completed</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrapper">
                <Search size={14} className="search-icon" />
                <input
                  id="agent-search"
                  className="search-input"
                  placeholder="Search by area..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <select
                id="status-filter"
                className="filter-select"
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
              {(statusFilter || search) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setStatusFilter(''); setSearch(''); setPage(1); fetchAgents({ page: 1, status: '', search: '' }); }}
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {pagination.total} agent{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', display: 'block' }} />
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><Users size={28} /></div>
                <div className="empty-title">No agents found</div>
                <p className="empty-desc">
                  {search || statusFilter
                    ? 'Try adjusting your search or filters.'
                    : 'Get started by adding your first delivery agent.'}
                </p>
                {!search && !statusFilter && (
                  <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
                    <Plus size={15} /> Add First Agent
                  </button>
                )}
              </div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Contact</th>
                      <th>Service Area</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                      <th>Rating</th>
                      <th>Deliveries</th>
                      <th style={{ width: 80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} onClick={() => handleViewAgent(agent.id)}>
                        <td>
                          <div className="agent-name-cell">
                            <div className="agent-avatar">{getInitials(agent.full_name)}</div>
                            <div>
                              <div className="agent-name">{agent.full_name}</div>
                              <div className="agent-id">{agent.id.slice(0, 8)}…</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{agent.phone}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{agent.email}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <MapPin size={12} color="var(--text-muted)" />
                            <span style={{ color: 'var(--text-secondary)' }}>{agent.service_area}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-vehicle">
                            {VEHICLE_ICONS[agent.vehicle_type] || ''} {agent.vehicle_type}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${agent.status}`}>
                            <span className="badge-dot" />
                            {STATUS_LABELS[agent.status]}
                          </span>
                        </td>
                        <td>
                          <div className="rating">
                            <Star size={12} fill="var(--yellow)" />
                            {Number(agent.rating).toFixed(1)}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {agent.total_deliveries.toLocaleString()}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="action-buttons">
                            <button
                              className="btn btn-icon btn-ghost btn-sm"
                              title="Edit"
                              id={`edit-${agent.id}`}
                              onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', agent }); }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              className="btn btn-icon btn-danger btn-sm"
                              title="Delete"
                              id={`delete-${agent.id}`}
                              onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', agent }); }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination">
                    <div className="pagination-info">
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </div>
                    <div className="pagination-controls">
                      <button
                        className="page-btn"
                        disabled={pagination.page <= 1}
                        onClick={() => goToPage(pagination.page - 1)}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {getPageRange().map((p) => (
                        <button
                          key={p}
                          className={`page-btn${p === pagination.page ? ' active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="page-btn"
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => goToPage(pagination.page + 1)}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}
      {modal.type !== 'none' && (
        <div className="modal-overlay" onClick={() => !actionLoading && setModal({ type: 'none' })}>
          <div
            className={`modal${modal.type === 'detail' ? ' detail-modal' : ''}`}
            style={{ maxWidth: modal.type === 'detail' ? 640 : 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            {modal.type === 'create' && (
              <AgentForm
                onSubmit={handleCreate}
                onClose={() => setModal({ type: 'none' })}
                isLoading={actionLoading}
              />
            )}
            {modal.type === 'edit' && (
              <AgentForm
                agent={modal.agent}
                onSubmit={handleUpdate}
                onClose={() => setModal({ type: 'none' })}
                isLoading={actionLoading}
              />
            )}
            {modal.type === 'detail' && (
              <AgentDetail
                agent={modal.agent}
                fromCache={modal.fromCache}
                onClose={() => setModal({ type: 'none' })}
                onEdit={(a) => setModal({ type: 'edit', agent: a })}
                onDelete={(a) => setModal({ type: 'delete', agent: a })}
              />
            )}
            {modal.type === 'delete' && (
              <ConfirmDelete
                agent={modal.agent}
                onConfirm={handleDelete}
                onCancel={() => setModal({ type: 'none' })}
                isLoading={actionLoading}
              />
            )}
          </div>
        </div>
      )}

      <ToastContainer />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
