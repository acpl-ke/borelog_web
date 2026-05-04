export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  msg: string;
  isSucess: boolean;
  id?: number | null;
  cellNo?: string | null;
  emailId?: string | null;
}

export interface Project {
  id: number;
  name: string;
  clientName: string;
}

export interface Personnel {
  id: number;
  name: string;
  role: string; // 'Operator' | 'Supervisor' | 'Liner' | 'Fitter' | 'MuckRemover' | 'Labour'
}

export interface Rig {
  id: number;
  name: string;
  code: string;
}

export interface PileRecentEntry {
  pileNo: string;
  projectName: string;
  lastUpdatedAt: string;
}

export interface PileValidationResponse {
  msg: string;
  isSuccess: boolean;
}

export interface BoreLogSaveResponse {
  isSuccess: boolean;
  msg: string;
}

export interface BoreLogEntry {
  id?: number;
  projectId: number;
  pileNo: string;
  // General
  dateOfBoringStarted: string; // ISO yyyy-mm-dd
  dateOfConcreted: string;
  rotaryRigId: number;
  // Bore measurements (metres, 3 decimals)
  soilBore: number;
  rockBore: number;
  softRock: number;
  rockSocket: number;
  // Liner & Casing
  linerLength: number;
  casingLength: number;
  actualLength: number;
  casingTop: number;
  // Reference levels
  egl: number;
  emptyBoreAfterConcrete: number;
  concreteBoreAfterConcrete: number;
  // Time & Depth Log
  soilBoreTimeFrom: string; // HH:mm
  soilBoreTimeTo: string;
  soilBoreDepthFrom: number;
  soilBoreDepthTo: number;
  rockBoreTimeFrom: string;
  rockBoreTimeTo: string;
  rockBoreDepthFrom: number;
  rockBoreDepthTo: number;
  // Personnel
  operatorId?: number;
  siteSupervisorId?: number;
  linerId?: number;
  fitterId?: number;
  muckRemoverId?: number;
  labourId?: number;
  // Remarks
  remarks: string;
  // Audit
  webOprId?: number;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const emptyBoreLog = (projectId: number, pileNo: string): BoreLogEntry => ({
  projectId,
  pileNo,
  dateOfBoringStarted: new Date().toISOString().slice(0, 10),
  dateOfConcreted: new Date().toISOString().slice(0, 10),
  rotaryRigId: 0,
  soilBore: 0,
  rockBore: 0,
  softRock: 0,
  rockSocket: 0,
  linerLength: 0,
  casingLength: 0,
  actualLength: 0,
  casingTop: 0,
  egl: 0,
  emptyBoreAfterConcrete: 0,
  concreteBoreAfterConcrete: 0,
  soilBoreTimeFrom: '',
  soilBoreTimeTo: '',
  soilBoreDepthFrom: 0,
  soilBoreDepthTo: 0,
  rockBoreTimeFrom: '',
  rockBoreTimeTo: '',
  rockBoreDepthFrom: 0,
  rockBoreDepthTo: 0,
  remarks: '',
});
