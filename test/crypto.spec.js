import { describe, it } from 'mocha';
import * as crypto from '../lib/services/crypto.js';
import assert from 'assert';

describe('Crypto Service', function () {
  it('should encrypt and decrypt a password 1st part', function () {
    const part = '4i77cg3ah4p96eez';

    const encrypted = crypto.encryptPart(part);
    assert.notEqual(part, encrypted);

    const decrypted = crypto.decryptPart(encrypted);
    assert.strictEqual(part, decrypted);
  });

  it('should throw error on invalid part length on encryption', function () {
    const invalidPart = 'asdasc';

    assert.throws(() => crypto.encryptPart(invalidPart));
  });

  it('should throw error on invalid string input on decryption', function () {
    const invalidString = 'asdasc';

    assert.throws(() => crypto.decryptPart(invalidString));
  });

  it('should parse and merge the encryption key', function () {
    const key = '4i77cg3ah4p96eez4i75s53ah4p96eez';
    const parsed = crypto.parse(key);
    const merged = crypto.merge(parsed);

    assert.equal(key, merged);
  });
});
