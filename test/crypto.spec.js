import { describe, it } from 'mocha';
import {
  encryptPart1,
  decryptPart1,
  encryptPart2,
  decryptPart2
} from '../lib/services/crypto.js';
import assert from 'assert';

describe('Crypto Service', function () {
  it('should encrypt and decrypt a password 1st part', function () {
    const part = Math.random().toString().substring(0, 16);

    const encrypted = encryptPart1(part);
    assert.notEqual(part, encrypted);

    const decrypted = decryptPart1(encrypted);
    assert.equal(part, decrypted);
  });

  it('should encrypt and decrypt a password 2nd part', function () {
    const part = Math.random().toString().substring(0, 16);
    const userPass = Math.random().toString(36);

    const encrypted = encryptPart2(part, userPass);
    assert.notEqual(part, encrypted);

    const decrypted = decryptPart2(encrypted, userPass);
    assert.equal(part, decrypted);
  });
});
