import api from './api';
import { SmtpSettings, SmtpTestRequest } from '../types';

export const smtpService = {
  async get(): Promise<SmtpSettings | null> {
    try {
      const { data } = await api.get<SmtpSettings>('/admin/smtp');
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async save(settings: SmtpSettings): Promise<{ isSuccess: boolean; msg: string }> {
    const { data } = await api.post<{ isSuccess: boolean; msg: string }>('/admin/smtp', settings);
    return data;
  },

  async sendTest(request: SmtpTestRequest): Promise<{ isSuccess: boolean; msg: string }> {
    const { data } = await api.post<{ isSuccess: boolean; msg: string }>('/admin/smtp/test', request);
    return data;
  },
};
