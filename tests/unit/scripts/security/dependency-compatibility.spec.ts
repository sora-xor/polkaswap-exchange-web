import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

/** Exercise installed dependencies with native Node resolution, bypassing app test aliases. */
function runDependencyProbe<T>(source: string): T {
  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10_000,
  });
  return JSON.parse(output) as T;
}

describe('scoped dependency security upgrade compatibility', () => {
  it('preserves UnixFS wire bytes, round trips, and the pre-upgrade content identifier', () => {
    const result = runDependencyProbe<{
      formats: { file: string; directory: string; metadata: string; size: number; roundTrip: string }[];
      cid: string;
      dagSize: number;
    }>(`
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const formats = [];
      const data = Buffer.from('Polkaswap security regression\\n');
      for (const { UnixFS } of [await import('ipfs-unixfs'), require('ipfs-unixfs')]) {
        const file = new UnixFS({ type: 'file', data });
        const metadata = new UnixFS({
          type: 'file', data: Uint8Array.of(0, 255, 128), blockSizes: [257, 65536],
          mode: 0o600, mtime: { secs: 1700000000, nsecs: 123456789 },
        });
        formats.push({
          file: Buffer.from(file.marshal()).toString('hex'),
          directory: Buffer.from(new UnixFS({ type: 'directory' }).marshal()).toString('hex'),
          metadata: Buffer.from(metadata.marshal()).toString('hex'),
          size: metadata.fileSize(),
          roundTrip: Buffer.from(UnixFS.unmarshal(file.marshal()).data).toString('utf8'),
        });
      }
      const { importer } = await import('ipfs-unixfs-importer');
      const results = [];
      for await (const entry of importer([{ path: 'fixture.txt', content: data }], {}, {
        onlyHash: true, cidVersion: 0, rawLeaves: false,
      })) results.push(entry);
      console.log(JSON.stringify({ formats, cid: results[0].cid.toString(), dagSize: results[0].size }));
    `);

    expect(result.formats).toHaveLength(2);
    for (const format of result.formats) {
      expect(format).toEqual({
        file: '0802121e506f6c6b61737761702073656375726974792072656772657373696f6e0a181e',
        directory: '0801',
        metadata: '0802120300ff801884820420810220808004388003420b0880e2cfaa061515cd5b07',
        size: 65796,
        roundTrip: 'Polkaswap security regression\n',
      });
    }
    expect(result.cid).toBe('QmZgugGM3zNPnJkJPTia4QokBaeQi3nZEQBMeppntJWzhT');
    expect(result.dagSize).toBe(38);
  });

  it.each(['import', 'require'])('preserves IPFS string timeout success and expiration using %s', (format) => {
    const result = runDependencyProbe<{
      value: string;
      signal: boolean;
      name: string;
      code: string;
      aborted: boolean;
    }>(`
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const { withTimeoutOption } = ${format === 'import' ? 'await import' : 'require'}('ipfs-core-utils/with-timeout-option');
      let signal;
      const value = await withTimeoutOption(async (options) => {
        signal = !!options.signal && !options.signal.aborted;
        return 'completed';
      })({ timeout: '1s' });
      let pendingSignal;
      try {
        await withTimeoutOption((options) => {
          pendingSignal = options.signal;
          return new Promise(() => {});
        })({ timeout: '10ms' });
        throw new Error('Timeout did not reject');
      } catch (error) {
        console.log(JSON.stringify({ value, signal, name: error.name, code: error.code, aborted: pendingSignal.aborted }));
      }
    `);

    expect(result).toEqual({
      value: 'completed',
      signal: true,
      name: 'TimeoutError',
      code: 'ERR_TIMEOUT',
      aborted: true,
    });
  });

  it('loads Sora Pay notifications and renders mail with the upgraded Nodemailer entirely offline', () => {
    const result = runDependencyProbe<{
      delivery: string;
      invalidAddress: string;
      envelope: { from: string; to: string[] };
      buffered: boolean;
      message: string;
    }>(`
      import nodemailer from 'nodemailer';
      const notifications = new URL('../relay/notifications.js', import.meta.resolve('@sora/sora-pay/core'));
      const { emailDelivery } = await import(notifications.href);
      const options = {
        host: 'smtp.example.invalid', port: 465, user: 'offline', password: 'not-a-real-password',
        from: 'sender@example.invalid', to: 'recipient@example.invalid',
      };
      // Factory construction is lazy: no SMTP connection is made without send().
      const delivery = emailDelivery(options);
      let invalidAddress;
      try { emailDelivery({ ...options, to: 'invalid' }); }
      catch (error) { invalidAddress = error.message; }
      const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
      const mail = await transport.sendMail({
        from: options.from, to: options.to, subject: 'Offline compatibility check',
        text: 'No external delivery', messageId: '<offline@example.invalid>',
      });
      transport.close();
      console.log(JSON.stringify({
        delivery: typeof delivery.send, invalidAddress, envelope: mail.envelope,
        buffered: Buffer.isBuffer(mail.message), message: mail.message.toString('utf8'),
      }));
    `);

    expect(result.delivery).toBe('function');
    expect(result.invalidAddress).toBe('Invalid notification email');
    expect(result.envelope).toEqual({ from: 'sender@example.invalid', to: ['recipient@example.invalid'] });
    expect(result.buffered).toBe(true);
    expect(result.message).toContain('Subject: Offline compatibility check');
    expect(result.message).toContain('Message-ID: <offline@example.invalid>');
    expect(result.message).toContain('No external delivery');
  });
});
