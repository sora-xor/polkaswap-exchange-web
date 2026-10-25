import type { SubjectInfo } from './types';
interface Result {
  accounts: SubjectInfo;
  addresses: SubjectInfo;
  contracts: SubjectInfo;
}
export declare const obervableAll: import('rxjs').Observable<Result>;
export {};
