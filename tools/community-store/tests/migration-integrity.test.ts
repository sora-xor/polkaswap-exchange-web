import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Preserve the original JSON formatting, including historical inline objects and escaped Unicode.
const expected = {
  "config/merchant.disabled.json.example": "099085afbbcf7c5783241662f4a14574c5be2b136bf36dfba2f361589588ae3f",
  "config/merchant.polkaswap.json.example": "8e412c089de0ec380158b851002e153fc672e51b2bb33fd2221ef55092208e56",
  "config/merchant.polkaswap-worldwide.json.example": "5d844b686a00514346988bb528237617356cb5d98d158a033b808f0cd335e7da",
  "shipping/japan-post-rates.json": "061797b5e8a8612b09c01d765ee9cbd9133e984e033f4929486f9825731ec67d",
  "shipping/tea-destinations.json": "9aea147274c63b4757294a650ce4165e1e7dbf0c00b8018cada9cf22f2b0f030",
  "shipping/japan-post-availability.json": "4579c61a6440ed8db2c2b5d98d4c14ae21c3f8bba84734121062cd9a032220c5"
};

test('merchant inputs preserve their original bytes apart from the explicit MOF resume threshold', () => {
  for (const [path, digest] of Object.entries(expected)) {
    const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
    const serialized = bytes.toString('utf8');
    const parsed = JSON.parse(serialized);
    let originalBytes = bytes;
    if (path.startsWith('config/')) {
      assert.equal(parsed.storageMinimumFreeBytes, '5368709120', path);
      assert.equal(parsed.storageResumeFreeBytes, '10737418240', path);
      const field = '  "storageResumeFreeBytes": "10737418240",\n';
      assert.equal(serialized.split(field).length, 2, path);
      delete parsed.storageResumeFreeBytes;
      const originalSerialized = serialized.replace(field, '');
      assert.deepEqual(JSON.parse(originalSerialized), parsed, path);
      originalBytes = Buffer.from(originalSerialized);
    }
    assert.equal(createHash('sha256').update(originalBytes).digest('hex'), digest, path);
  }
});
