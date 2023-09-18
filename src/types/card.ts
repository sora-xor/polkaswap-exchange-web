export enum KycStatus {
  Started = 'Started',
  Completed = 'Completed',
  Failed = 'Failed',
  Rejected = 'Rejected',
  Successful = 'Successful',
}

export enum VerificationStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  None = 'None',
}

export type Token = 'accessToken' | 'refreshToken';

export enum CardUIViews {
  Start = 'Start',
  Phone = 'Phone',
  Email = 'Email',
  Kyc = 'Kyc',
  Payment = 'Payment',
  KycResult = 'KycResult',
  Dashboard = 'Dashboard',
}

export interface Status {
  verificationStatus: Nullable<VerificationStatus>;
  kycStatus: Nullable<KycStatus>;
  rejectReason?: Nullable<string>;
}

export interface UserInfo {
  iban: Nullable<string>;
}

export interface AttemptCounter {
  hasFreeAttempts: Nullable<boolean>;
  freeAttemptsLeft: Nullable<string>;
  totalFreeAttempts: Nullable<string>;
}
