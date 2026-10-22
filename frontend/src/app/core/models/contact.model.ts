import { UserSummary } from './user.model';

export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';

export interface Contact {
  contactId: string;
  user: UserSummary;
  status: ContactStatus;
  isIncoming: boolean;
  createdAt: string;
}
