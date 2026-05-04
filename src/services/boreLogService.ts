import api from './api';
import { authService } from './authService';
import {
  BoreLogEntry,
  BoreLogSaveResponse,
  Project,
  Personnel,
  Rig,
  PileRecentEntry,
  PileValidationResponse,
} from '../types';

export const boreLogService = {
  async getProjects(userId: number): Promise<Project[]> {
    const { data } = await api.get<Project[]>('/projects', { params: { userId } });
    return data;
  },

  async getPileEntry(projectId: number, pileNo: string): Promise<BoreLogEntry | null> {
    try {
      const { data } = await api.get<BoreLogEntry>(`/projects/${projectId}/piles/${pileNo}`);
      return data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  async getRecentPiles(): Promise<PileRecentEntry[]> {
    const userId = authService.getCurrentUserId();
    const { data } = await api.get<PileRecentEntry[]>('/borelogs/recent', {
      params: { userId },
    });
    return data;
  },

  async validatePileNo(projectId: number, pileNo: string): Promise<PileValidationResponse> {
    const { data } = await api.get<PileValidationResponse>('/projects/validate-pile', {
      params: { projectId, pileNo },
    });
    return data;
  },

  async save(entry: BoreLogEntry): Promise<BoreLogSaveResponse> {
    const { data } = await api.post<BoreLogSaveResponse>('/borelogs/save', {
      projectId: entry.projectId,
      pileNo: entry.pileNo,
      dateOfBoringStarted: entry.dateOfBoringStarted,
      dateOfConcreted: entry.dateOfConcreted,
      rotaryRigId: entry.rotaryRigId,
      soilBore: entry.soilBore,
      rockBore: entry.rockBore,
      linerLength: entry.linerLength,
      egl: entry.egl,
      casingLength: entry.casingLength,
      actualLength: entry.actualLength,
      casingTop: entry.casingTop,
      rockSocket: entry.rockSocket,
      soilBoreTimeFrom: entry.soilBoreTimeFrom,
      soilBoreTimeTo: entry.soilBoreTimeTo,
      rockBoreTimeFrom: entry.rockBoreTimeFrom,
      rockBoreTimeTo: entry.rockBoreTimeTo,
      soilBoreDepthFrom: entry.soilBoreDepthFrom,
      soilBoreDepthTo: entry.soilBoreDepthTo,
      rockBoreDepthFrom: entry.rockBoreDepthFrom,
      rockBoreDepthTo: entry.rockBoreDepthTo,
      emptyBoreAfterConcrete: entry.emptyBoreAfterConcrete,
      concreteBoreAfterConcrete: entry.concreteBoreAfterConcrete,
      linerId: entry.linerId,
      operatorId: entry.operatorId,
      fitterId: entry.fitterId,
      remarks: entry.remarks,
      webOprId: entry.webOprId,
    });
    return data;
  },
};

export const lookupService = {
  async getRigs(projectId: number, boringDate: string): Promise<Rig[]> {
    const { data } = await api.get<Rig[]>('/lookups/rigs', {
      params: { projectId, boringDate },
    });
    return data;
  },

  async getPersonnel(projectId: number): Promise<Personnel[]> {
    const { data } = await api.get<Personnel[]>('/lookups/personnel', {
      params: { projectId },
    });
    return data;
  },
};
