import { BehaviorSubject } from 'rxjs';
export declare const env: {
  isDevelopment: () => boolean;
  set: (isDevelopment: boolean) => void;
  subject: BehaviorSubject<boolean>;
};
