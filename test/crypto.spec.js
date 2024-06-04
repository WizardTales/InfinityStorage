import { describe, it } from 'mocha';
import { encryptPart, decryptPart } from '../lib/services/crypto.js';
import assert from 'assert';

describe('Crypto Service', function () {
  it('should encrypt and decrypt a password 1st part', function () {
    const part = '4i77cg3ah4p96eez';

    const encrypted = encryptPart(part);
    assert.notEqual(part, encrypted);

    const decrypted = decryptPart(encrypted);
    assert.strictEqual(part, decrypted);
  });

  it('should throw error on invalid part length on encryption', function () {
    const invalidPart = 'asdasc';

    assert.throws(() => encryptPart(invalidPart));
  });

  it('should throw error on invalid string input on decryption', function () {
    const invalidString = 'asdasc';

    assert.throws(() => decryptPart(invalidString));
  });
});
