import rand from 'crypto-random-string';
import crypto from 'crypto';
import * as dirService from './directory.js';

import SQL from 'sql-template-tag';

export default async ({ pool, username, password, ...data }) => {
  try {
    const salt = rand({ length: 32 });

    const hash = crypto
      .createHash('sha512')
      .update(`${password.toUpperCase()}${salt}`)
      .digest('hex');

    const user = await pool.retry(async (client) => {
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

      return inserted;
    });

    const globalDir = `/global/${username}`;
    const directory = await dirService.createPath(pool, globalDir);

    await pool.query(
      SQL`UPDATE "user" SET "globalDirId" = ${directory.id} WHERE id = ${user.id}`
    );

    return { code: 200, data: { id: user.id, username, data } };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};
