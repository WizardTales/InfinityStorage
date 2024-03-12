'use strict';

import SQL from 'sql-template-tag';
import Promise from 'bluebird';

export default {
  request: async (request, { username, password, ip }) => {
    const { authenticator } = request.server.plugins.sp;
    // const { rows } = await pool.query(
    //  'SELECT * FROM "user" WHERE username = $1 AND password = $2',
    //  [username, password]
    // );

    const result = await authenticator.auth(username, ip, password);
    if (result.auth === true && result.code === 200) {
      const { pool } = request.server.plugins.pg;
      const {
        rows: [user]
      } = await pool.query(
        SQL`SELECT "id", "username" 
        FROM "user" WHERE "username" = ${username}`
      );

      return {
        ...result,
        user
      };
    }

    return result;
  }

  // pin: 'service:user,command:auth'
};
