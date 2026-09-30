import api from './api';
import {
  LoginRequest,
  LoginResponse,
  OtpVerifyRequest,
  OtpVerifyResponse,
  OtpResendResponse,
} from '../types';

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
  OtpRequired?: boolean;
  OtpSessionId?: string | null;
};

const toBool = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }
  return false;
};

const toId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isLoginSuccess = (raw: AnyUser): boolean => {
  const fromFlag = toBool(raw.isSucess ?? raw.IsSucess ?? raw.isSuccess ?? raw.IsSuccess);
  if (fromFlag) return true;
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
    otpRequired: toBool(raw.otpRequired ?? raw.OtpRequired),
    otpSessionId: raw.otpSessionId ?? raw.OtpSessionId ?? null,
  };
};

// Storage keys
const USER_KEY = 'borelog_user';
const DEVICE_TOKEN_KEY = 'borelog_device_token';      // per-user device token, persists logout
const OTP_SESSION_KEY = 'borelog_otp_session';        // tied to the in-progress OTP session

export const authService = {
  /**
   * Step 1 - submit credentials. The backend responds with either:
   *   (a) full success → store user, navigate to /find-pile; OR
   *   (b) otpRequired=true + otpSessionId → navigate to /otp page.
   */
  async login(credentials: { loginId: string; password: string }): Promise<LoginResponse> {
    const deviceToken = this.getDeviceTokenFor(credentials.loginId);
    const payload: LoginRequest = {
      loginId: credentials.loginId,
      password: credentials.password,
      deviceToken: deviceToken ?? null,
    };

    const { data } = await api.post<AnyUser>('/auth/login', payload);
    const normalized = normalizeUser(data);

    // Two paths:
    if (normalized.isSucess && !normalized.otpRequired) {
      // Direct login - persist user
      const serialized = JSON.stringify(normalized);
      localStorage.setItem(USER_KEY, serialized);
      sessionStorage.setItem(USER_KEY, serialized);
    } else if (normalized.otpRequired && normalized.otpSessionId) {
      // OTP path - hold session id; do NOT persist user yet
      sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify({
        otpSessionId: normalized.otpSessionId,
        loginId: credentials.loginId,
      }));
    }

    return normalized;
  },

  /**
   * Step 2 - verify the 4-digit OTP. On success, persist the user and the device token (if "remember" was checked).
   */
  async verifyOtp(otp: string, rememberDevice: boolean): Promise<OtpVerifyResponse> {
    const sess = this.getPendingOtpSession();
    if (!sess) {
      return { msg: 'No OTP session found. Please login again.', isSuccess: false };
    }

    const payload: OtpVerifyRequest = {
      otpSessionId: sess.otpSessionId,
      otp,
      rememberDevice,
    };
    const { data } = await api.post<OtpVerifyResponse>('/auth/verify-otp', payload);

    if (data.isSuccess) {
      const userObj: LoginResponse = {
        msg: data.msg,
        isSucess: true,
        id: data.id ?? null,
        cellNo: data.cellNo ?? null,
        emailId: data.emailId ?? null,
      };
      const serialized = JSON.stringify(userObj);
      localStorage.setItem(USER_KEY, serialized);
      sessionStorage.setItem(USER_KEY, serialized);

      // Persist device token tied to the loginId so subsequent logins skip OTP
      if (rememberDevice && data.deviceToken) {
        this.setDeviceTokenFor(sess.loginId, data.deviceToken);
      }

      // Clear pending OTP session
      sessionStorage.removeItem(OTP_SESSION_KEY);
    }
    return data;
  },

  /**
   * Resend OTP for the in-progress session.
   */
  async resendOtp(): Promise<OtpResendResponse> {
    const sess = this.getPendingOtpSession();
    if (!sess) return { msg: 'No OTP session found.', isSuccess: false };
    const { data } = await api.post<OtpResendResponse>('/auth/resend-otp', {
      otpSessionId: sess.otpSessionId,
    });
    return data;
  },

  /**
   * Standard logout — clears local session, but the device remains "remembered".
   * Subsequent logins by this user on this device will NOT require OTP.
   */
  logout(): void {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(OTP_SESSION_KEY);
  },

  /**
   * "Logout OTP" — clears local session AND invalidates the device token on the server,
   * forcing OTP next time this user logs in (on this device or any other).
   */
  async logoutOtp(): Promise<void> {
    const user = this.getCurrentUser();
    const userId = user ? toId((user as AnyUser).id) : null;
    try {
      // Best-effort - server should also clear device token using userId
      await api.post('/auth/logout-otp', { userId });
    } catch (err) {
      console.warn('Logout OTP server call failed (continuing local clear)', err);
    }
    // Clear all device tokens locally too
    this.clearAllDeviceTokens();
    this.logout();
  },

  isAuthenticated(): boolean {
    return !!(localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY));
  },

  getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return normalizeUser(JSON.parse(raw) as AnyUser);
    } catch {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
      return null;
    }
  },

  getCurrentUserId(): number | null {
    const user = this.getCurrentUser() as AnyUser | null;
    if (!user) return null;
    return (
      toId(user.id) ??
      toId(user.Id) ??
      toId(user.ID) ??
      toId(user.userId) ??
      toId(user.UserID)
    );
  },

  // ---- Device token helpers ----
  // Stored as { [loginIdLower]: token } so multiple users on the same device each get their own token.
  getDeviceTokenFor(loginId: string): string | null {
    const raw = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!raw) return null;
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      return map[loginId.trim().toLowerCase()] ?? null;
    } catch {
      return null;
    }
  },

  setDeviceTokenFor(loginId: string, token: string): void {
    let map: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(DEVICE_TOKEN_KEY);
      if (raw) map = JSON.parse(raw) as Record<string, string>;
    } catch { /* ignore */ }
    map[loginId.trim().toLowerCase()] = token;
    localStorage.setItem(DEVICE_TOKEN_KEY, JSON.stringify(map));
  },

  clearAllDeviceTokens(): void {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  },

  // ---- Pending OTP session helpers ----
  getPendingOtpSession(): { otpSessionId: string; loginId: string } | null {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  hasPendingOtp(): boolean {
    return !!this.getPendingOtpSession();
  },
};
