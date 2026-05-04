import api from './api';
import { LoginRequest, LoginResponse } from '../types';

type AnyUser = LoginResponse & {
  data?: AnyUser;
  Msg?: string;
  IsSuccess?: boolean | number | string;
  IsSucess?: boolean;
  isSuccess?: boolean | number | string;
  Id?: number | null;
  ID?: number | string | null;
  userId?: number | null;
  UserID?: number | null;
  CellNo?: string | null;
  EmailID?: string | null;
};

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
};

const toId = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isLoginSuccess = (raw: AnyUser): boolean => {
  const fromFlag = toBool(raw.isSucess ?? raw.IsSucess ?? raw.isSuccess ?? raw.IsSuccess);
  if (fromFlag) {
    return true;
  }

  const msg = (raw.msg ?? raw.Msg ?? '').toString().trim().toLowerCase();
  return msg === 'login success';
};

const normalizeUser = (input: AnyUser): LoginResponse => {
  const raw = input?.data && typeof input.data === 'object' ? input.data : input;
  const normalizedId =
    toId(raw.id) ??
    toId(raw.Id) ??
    toId(raw.ID) ??
    toId(raw.userId) ??
    toId(raw.UserID);

  return {
    msg: raw.msg ?? raw.Msg ?? '',
    isSucess: isLoginSuccess(raw),
    id: normalizedId ?? null,
    cellNo: raw.cellNo ?? raw.CellNo ?? null,
    emailId: raw.emailId ?? raw.EmailID ?? null,
  };
};

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<AnyUser>('/auth/login', credentials);
    const normalized = normalizeUser(data);
    if (normalized.isSucess) {
      const serialized = JSON.stringify(normalized);
      localStorage.setItem('borelog_user', serialized);
      sessionStorage.setItem('borelog_user', serialized);
    }
    return normalized;
  },

  logout(): void {
    localStorage.removeItem('borelog_user');
    sessionStorage.removeItem('borelog_user');
  },

  isAuthenticated(): boolean {
    return !!(localStorage.getItem('borelog_user') || sessionStorage.getItem('borelog_user'));
  },

  getCurrentUser() {
    const raw = localStorage.getItem('borelog_user') || sessionStorage.getItem('borelog_user');
    if (!raw) {
      return null;
    }

    try {
      return normalizeUser(JSON.parse(raw) as AnyUser);
    } catch {
      localStorage.removeItem('borelog_user');
      sessionStorage.removeItem('borelog_user');
      return null;
    }
  },

  getCurrentUserId(): number | null {
    const user = this.getCurrentUser() as AnyUser | null;
    if (!user) {
      return null;
    }

    return (
      toId(user.id) ??
      toId(user.Id) ??
      toId(user.ID) ??
      toId(user.userId) ??
      toId(user.UserID)
    );
  },
};
