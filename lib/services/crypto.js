import config from '../../config.js';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const authTagLength = 16;
const options = { authTagLength };
const IV_BYTE_LEN = 12;
const ALGO = 'aes-256-gcm';

const peppers = config.crypto.peppers;

export function encryptPart (part) {
  const pLen = peppers.length;
  const pIndex = Math.floor(Math.random() * pLen);
  const key = config.crypto.peppers[pIndex];

  const iv = randomBytes(IV_BYTE_LEN);
  const cipher = createCipheriv(ALGO, key, iv, options);
  const encrypted = Buffer.concat([
    cipher.update(part, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  const buf = Buffer.concat([iv, encrypted, authTag]);
  return `${pIndex}_${buf.toString('base64')}`;
}

export function decryptPart (str) {
  const [pIndex, ciphertextbase64] = str.split('_');
  const key = peppers[parseInt(pIndex)];

  const ciphertext = Buffer.from(ciphertextbase64, 'base64');
  const authTag = ciphertext.subarray(-authTagLength);
  const iv = ciphertext.subarray(0, IV_BYTE_LEN);
  const encryptedMessage = ciphertext.subarray(IV_BYTE_LEN, -authTagLength);
  const decipher = createDecipheriv(ALGO, key, iv, options);
  decipher.setAuthTag(authTag);
  let messagetext = decipher.update(encryptedMessage);
  messagetext = Buffer.concat([messagetext, decipher.final()]);
  return messagetext;
}
