import type {
  Agent,
  AgentFormData,
  AgentListResponse,
  AgentResponse,
  StatsResponse,
} from '@/types/agent';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API = `${BASE_URL}/api/agents`;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'API request failed') as Error & { status: number; errors?: unknown };
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }

  return data as T;
}

export interface ListParams {
  status?: string;
  service_area?: string;
  page?: number;
  limit?: number;
}

export const agentApi = {
  list: (params: ListParams = {}): Promise<AgentListResponse> => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.service_area) query.set('service_area', params.service_area);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return apiFetch<AgentListResponse>(`${API}?${query}`);
  },

  get: (id: string): Promise<AgentResponse> =>
    apiFetch<AgentResponse>(`${API}/${id}`),

  create: (data: AgentFormData): Promise<AgentResponse & { message: string }> =>
    apiFetch(`${API}`, { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<AgentFormData>): Promise<AgentResponse & { message: string }> =>
    apiFetch(`${API}/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string): Promise<{ success: boolean; message: string; agent: Agent }> =>
    apiFetch(`${API}/${id}`, { method: 'DELETE' }),

  stats: (): Promise<StatsResponse> =>
    apiFetch<StatsResponse>(`${API}/stats`),
};
