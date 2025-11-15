import { vi } from 'vitest';
type NotificationsMock = {
  show: ReturnType<typeof vi.fn>;
};
declare module '@soramitsu-ui/ui' {
  function __setNotificationsMock(mock: NotificationsMock): void;
  function __resetNotificationsMock(): void;
}
export {};
