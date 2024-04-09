import rand from 'crypto-random-string';
import crypto from 'crypto';

import SQL from 'sql-template-tag';
import storageService from './storage.js';

export default async ({ pool, username, password, ...data }) => {
  const salt = rand({ length: 32 });

  const hash = crypto
    .createHash('sha512')
    .update(`${password.toUpperCase()}${salt}`)
    .digest('hex');

  return pool
    .retry(async (client) => {
      const {
        rows: [inserted]
      } = await client.query(
        SQL`INSERT INTO "user" (
            "username", 
            "hash", 
            "salt", 
            "data"
          )
          VALUES (
            ${username},
            ${hash},
            ${salt},
            ${data}
          ) RETURNING "id"`
      );

      const {
        code,
        msg: { storage },
        err
      } = await storageService.createStorage(client, inserted, {});

      if (code !== 200) {
        throw err;
      }

      return { code: 200, user: { id: inserted.id, username, data }, storage };
    })
    .catch((err) => {
      return { code: 409, Error: err.toString() };
    });
};
