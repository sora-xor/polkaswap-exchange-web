import dayjs from 'dayjs/esm';
import duration from 'dayjs/esm/plugin/duration';

let installed = false;

export function installDayjsDuration(): void {
  if (installed) return;
  dayjs.extend(duration);
  installed = true;
}
