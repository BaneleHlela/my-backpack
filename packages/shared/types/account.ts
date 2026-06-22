// IAccount interface — mirrors the Account Mongoose model, used across apps
export interface IAuthProvider {
  provider: 'local' | 'google' | 'facebook';
  providerId: string;
}

export interface IAccount {
  _id: string;
  email?: string;
  authProviders: IAuthProvider[];
  profiles: string[];
  activeProfile?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
