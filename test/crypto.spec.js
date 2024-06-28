import { describe, it } from 'mocha';
import * as crypto from '../lib/services/crypto.js';
import nodeCrypto from 'crypto';
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

  it('should parse and unparse the encryption key', function () {
    const key = '4i77cg3ah4p96eez2i75s53ah4p96efy';
    const serverPart = key.substring(0, 16);
    const userPart = key.substring(16, 32);

    const userPass = 'test123';
    const userPartEnc = encrypt2ndPart(userPart, serverPart, userPass);

    const [first, second] = crypto.parse(serverPart, userPartEnc);
    const download = crypto.unparse(first, second);

    const userPartDecr = decrypt2ndPart(
      download.userPart,
      serverPart,
      userPass
    );

    assert.equal(userPart, userPartDecr);
    assert.equal(serverPart, download.serverPart);
  });
});

const authTagLength = 16;
const options = { authTagLength };
const IV_BYTE_LEN = 12;
const ALGO = 'aes-256-gcm';

function encrypt2ndPart (part2, part1, userPass) {
  const iv = nodeCrypto.randomBytes(IV_BYTE_LEN);

  const key1 = nodeCrypto
    .createHash('sha256')
    .update(String(userPass))
    .digest('base64')
    .substring(0, 32);
  const cipher1 = nodeCrypto.createCipheriv(ALGO, key1, iv, options);
  const enc1 = Buffer.concat([cipher1.update(part2, 'utf8'), cipher1.final()]);

  const firstStep = Buffer.concat([iv, enc1, cipher1.getAuthTag()]);

  const key2 = nodeCrypto
    .createHash('sha256')
    .update(String(part1))
    .digest('base64')
    .substring(0, 32);
  const cipher2 = nodeCrypto.createCipheriv(ALGO, key2, iv, options);
  const enc2 = Buffer.concat([
    cipher2.update(firstStep, 'utf8'),
    cipher2.final()
  ]);

  return Buffer.concat([iv, enc2, cipher2.getAuthTag()]).toString('base64');
}

function decrypt2ndPart (str, part1, userPass) {
  const buf = Buffer.from(str, 'base64');

  const authTag2 = buf.subarray(-authTagLength);
  const iv2 = buf.subarray(0, IV_BYTE_LEN);
  const encryptedMsg2 = buf.subarray(IV_BYTE_LEN, -authTagLength);

  const key2 = nodeCrypto
    .createHash('sha256')
    .update(String(part1))
    .digest('base64')
    .substring(0, 32);
  const cipher2 = nodeCrypto.createDecipheriv(ALGO, key2, iv2, options);
  cipher2.setAuthTag(authTag2);

  const step2 = Buffer.concat([cipher2.update(encryptedMsg2), cipher2.final()]);

  const authTag1 = step2.subarray(-authTagLength);
  const iv1 = step2.subarray(0, IV_BYTE_LEN);
  const encryptedMsg1 = step2.subarray(IV_BYTE_LEN, -authTagLength);

  const key1 = nodeCrypto
    .createHash('sha256')
    .update(String(userPass))
    .digest('base64')
    .substring(0, 32);
  const cipher1 = nodeCrypto.createDecipheriv(ALGO, key1, iv1, options);
  cipher1.setAuthTag(authTag1);

  return Buffer.concat([
    cipher1.update(encryptedMsg1),
    cipher1.final()
  ]).toString();
}
