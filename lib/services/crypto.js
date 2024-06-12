import config from '../../config.js';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const authTagLength = 16;
const options = { authTagLength };
const IV_BYTE_LEN = 12;
const ALGO = 'aes-256-gcm';

const peppers = config.crypto.peppers;

/**
 * Parse encryption key
 *
 * @param {String?} serverPart
 * @param {String?} userPart
 */
export function parse (serverPart, userPart) {
  if (serverPart.length !== 16) {
    throw new InvalidCryptoInputError('encryptionKey');
  }

  return [encryptPart(serverPart), Buffer.from(userPart)];
}

export function unparse (serverPart, userPart) {
  if (!serverPart || !userPart) {
    throw new InvalidCryptoInputError('unparse input keys');
  }

  return {
    serverPart: decryptPart(serverPart),
    userPart: userPart.toString()
  };
}

/**
 * This method will encrypt the 1st 16 char part of the password string
 *
 * @param {String} part The part of the password to be encrypted
 * @returns {String} Encrypted String
 */
export function encryptPart (part) {
  if (part.length !== 16) {
    throw new InvalidCryptoInputError('part should be 16 characters long');
  }

  const pLen = peppers.length;
  const pIndex = Math.floor(Math.random() * pLen);
  const key = peppers[pIndex];

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

/**
 * This method will decrypt the part of password from encrypted string
 * Ex: 4_efK1KoA29Hd1wGAz84zv+lXYGJHLMaWMxqmdmq9xooklppFoOng+i5tcY7g=
 *
 * @param {String} str The part of password to be decrypted
 * @returns {String} password part
 */
export function decryptPart (str) {
  const [pIndex, cipherTextBase64] = str.split('_');
  const key = peppers[parseInt(pIndex)];

  if (!cipherTextBase64) {
    throw new InvalidCryptoInputError('Encrypted String');
  }

  const cipherText = Buffer.from(cipherTextBase64, 'base64');

  if (cipherText.length <= authTagLength + IV_BYTE_LEN) {
    throw new InvalidCryptoInputError('Encrypted String length');
  }

  const authTag = cipherText.subarray(-authTagLength);
  const iv = cipherText.subarray(0, IV_BYTE_LEN);
  const encryptedMsg = cipherText.subarray(IV_BYTE_LEN, -authTagLength);
  const decipher = createDecipheriv(ALGO, key, iv, options);
  decipher.setAuthTag(authTag);

  const part = decipher.update(encryptedMsg);
  return Buffer.concat([part, decipher.final()]).toString();
}

export class InvalidCryptoInputError extends Error {
  code = 403;
  name = 'InvalidCryptoInputError';
  constructor (inputName) {
    super('Invalid input: ' + inputName);
  }
}
