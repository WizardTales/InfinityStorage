import { describe, it } from 'mocha';
import { encryptPart, decryptPart } from '../lib/services/crypto.js';
import assert from 'assert';

describe('Crypto Service', function () {
  it('should encrypt and decrypt a password 1st part', function () {
    const part = Math.random().toString().substring(0, 16);

    const encrypted = encryptPart(part);
    assert.notEqual(part, encrypted);

    const decrypted = decryptPart(encrypted);
    assert.equal(part, decrypted);
  });
});
