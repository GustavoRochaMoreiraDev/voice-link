import { UserSummary } from './user.model';

export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ACCEPTED'
  | 'CONNECTING'
  | 'ACTIVE'
  | 'REJECTED'
  | 'MISSED'
  | 'ENDED'
  | 'FAILED';

export interface Call {
  id: string;
  caller: UserSummary;
  callee: UserSummary;
  status: CallStatus;
  createdAt: string;
  acceptedAt?: string;
  endedAt?: string;
  endReason?: string;
  durationSeconds?: number;
}
