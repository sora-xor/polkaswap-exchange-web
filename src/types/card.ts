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
}

export type Token = 'accessToken' | 'refreshToken';

export interface Status {
  verificationStatus: Nullable<VerificationStatus>;
  kycStatus: Nullable<KycStatus>;
}
