/** Browser globals shared by production injection and Vite's development optimizer. */
import { Buffer } from './buffer.ts';
import process from 'process/browser.js';

const global = globalThis;

globalThis.Buffer ||= Buffer;
globalThis.process ||= process;
globalThis.global ||= global;

export { Buffer, process, global };
