import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  Audit,
  AuditResults,
  CreateAuditRequest,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '@shared/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    // Attach token to every request
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    // Handle 401 responses
    this.client.interceptors.response.use(
      (res) => res,
      (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          // Don't redirect if already on auth pages
          if (!window.location.pathname.startsWith('/auth')) {
            window.location.href = '/auth/signin';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // ── Auth ──────────────────────────────────────────
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/login', data);
    localStorage.setItem('accessToken', res.data.accessToken);
    return res.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('accessToken', res.data.accessToken);
    return res.data;
  }

  async getProfile() {
    const res = await this.client.get('/auth/me');
    return res.data;
  }

  // ── Audits ────────────────────────────────────────
  async createAudit(data: CreateAuditRequest): Promise<Audit & { project?: any }> {
    const res = await this.client.post('/audits', data);
    return res.data;
  }

  async getAudits(): Promise<(Audit & { project?: any })[]> {
    const res = await this.client.get('/audits');
    return res.data;
  }

  async getAudit(id: string): Promise<Audit & { project?: any }> {
    const res = await this.client.get(`/audits/${id}`);
    return res.data;
  }

  // ── Health check ──────────────────────────────────
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();

// Error helper
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message[0];
    if (error.code === 'ECONNREFUSED') return 'Cannot connect to API server';
    if (error.code === 'ECONNABORTED') return 'Request timed out';
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
