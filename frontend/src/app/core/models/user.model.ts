export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  createdAt?: string;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  online: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}
