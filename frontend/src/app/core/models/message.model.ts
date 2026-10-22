import { UserSummary } from './user.model';

export interface Message {
  id: string;
  conversationId: string;
  sender: UserSummary;
  content: string;
  clientMessageId?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: string;
  participant: UserSummary;
  lastMessage?: Message;
  updatedAt: string;
}
