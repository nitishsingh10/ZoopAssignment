export type AgentStatus = 'active' | 'inactive' | 'on_leave';
export type VehicleType = 'bike' | 'scooter' | 'car' | 'van' | 'cycle';

export interface Agent {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  service_area: string;
  status: AgentStatus;
  vehicle_type: VehicleType;
  rating: number;
  total_deliveries: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AgentListResponse {
  success: boolean;
  fromCache: boolean;
  agents: Agent[];
  pagination: Pagination;
}

export interface AgentResponse {
  success: boolean;
  fromCache: boolean;
  agent: Agent;
}

export interface StatsResponse {
  success: boolean;
  fromCache: boolean;
  stats: {
    total: string;
    active: string;
    inactive: string;
    on_leave: string;
    avg_rating: string;
    total_deliveries: string;
    total_areas: string;
  };
}

export interface AgentFormData {
  full_name: string;
  phone: string;
  email: string;
  service_area: string;
  status: AgentStatus;
  vehicle_type: VehicleType;
  rating?: number;
  total_deliveries?: number;
  notes?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
