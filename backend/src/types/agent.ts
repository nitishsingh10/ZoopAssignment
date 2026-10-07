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
  created_at: Date;
  updated_at: Date;
}

export interface AgentCreateInput {
  full_name: string;
  phone: string;
  email: string;
  service_area: string;
  status?: AgentStatus;
  vehicle_type?: VehicleType;
  rating?: number;
  total_deliveries?: number;
  notes?: string | null;
}

export type AgentUpdateInput = Partial<AgentCreateInput>;

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AgentListResult {
  agents: Agent[];
  pagination: Pagination;
  fromCache?: boolean;
}

export interface AgentResult {
  agent: Agent;
  fromCache: boolean;
}

export interface AgentStats {
  total: string;
  active: string;
  inactive: string;
  on_leave: string;
  avg_rating: string;
  total_deliveries: string;
  total_areas: string;
  fromCache?: boolean;
}

export interface ListFilters {
  status?: string;
  service_area?: string;
  page?: number | string;
  limit?: number | string;
}
