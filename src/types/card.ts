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

export interface Status {
  verificationStatus: Nullable<VerificationStatus>;
  kycStatus: Nullable<KycStatus>;
  rejectReason?: Nullable<string>;
}
