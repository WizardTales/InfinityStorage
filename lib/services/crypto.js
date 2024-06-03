import config from '../../config.js';
import crypto from 'crypto';

const AUTH_TAG_LEN = 16;
const IV_BYTE_LEN = 12;
const KEY_BYTE_LEN = 32;

const peppers = config.crypto.peppers;
const algo = 'aes-256-gcm';
const iv = crypto.randomBytes(IV_BYTE_LEN);

export function encryptPart1 (part) {
  const pLen = peppers.length;
  const pIndex = Math.floor(Math.random() * pLen);

  const cipher = crypto.createCipheriv(algo, peppers[pIndex], iv, {
    authTagLength: AUTH_TAG_LEN
  });
  const encrypted = Buffer.concat([
    cipher.update(part, 'utf8'),
    cipher.final()
  ]);

  return `${pIndex}_${Buffer.concat([
    iv,
    encrypted,
    cipher.getAuthTag()
  ]).toString('base64')}`;
}

export function encryptPart2 (part, userPass) {
  const hash = crypto.createHash('sha256', { outputLength: KEY_BYTE_LEN });
  const hashedPass = hash.update(userPass).digest();
  const cipher = crypto.createCipheriv(algo, hashedPass, iv, {
    authTagLength: AUTH_TAG_LEN
  });
  const encrypted = Buffer.concat([
    cipher.update(part, 'utf8'),
    cipher.final()
  ]);

  return Buffer.concat([iv, encrypted, cipher.getAuthTag()]);
}

export function decryptPart1 (str) {
  const [pIndex, ciphertextbase64] = str.split('_');
  const key = peppers[parseInt(pIndex)];

  const ciphertext = Buffer.from(ciphertextbase64, 'base64');
  const authTag = ciphertext.subarray(-AUTH_TAG_LEN);
  const iv = ciphertext.subarray(0, IV_BYTE_LEN);
  const encryptedMessage = ciphertext.subarray(IV_BYTE_LEN, -AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(algo, key, iv, {
    authTagLength: AUTH_TAG_LEN
  });
  decipher.setAuthTag(authTag);
  let messagetext = decipher.update(encryptedMessage);
  messagetext = Buffer.concat([messagetext, decipher.final()]);
  return messagetext;
}

export function decryptPart2 (str, userPass) {
  const hash = crypto.createHash('sha256', { outputLength: KEY_BYTE_LEN });
  const hashedPass = hash.update(userPass).digest();
  const ciphertext = Buffer.from(str, 'base64');
  const authTag = ciphertext.subarray(-AUTH_TAG_LEN);
  const iv = ciphertext.subarray(0, IV_BYTE_LEN);
  const encryptedMessage = ciphertext.subarray(IV_BYTE_LEN, -AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(algo, hashedPass, iv, {
    authTagLength: AUTH_TAG_LEN
  });
  decipher.setAuthTag(authTag);
  let messagetext = decipher.update(encryptedMessage);
  messagetext = Buffer.concat([messagetext, decipher.final()]);
  return messagetext;
}
