import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  userId?: string;  // For compatibility
  tenant: {
    businessType: string;
  };
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
