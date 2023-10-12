'use strict';

import SQL from 'sql-template-tag';
import Promise from 'bluebird';

export default {
  /**
   * @param {Object} request - Request plugin object
   * @param {Object} request.server
   * @param {Object} request.server.plugins
   * @param {Object} request.server.plugins.pg
   * @param {import('pg-pool')} request.server.plugins.pg.pool - CRDB Interface
   */
  request: async (request, { storageId, filename, mime }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;

    const [{
      rows: [file]
    }] = await Promise.all(
      [
        pool.query(
          SQL`INSERT INTO "file" ("storageId", "filename", "mime")
                VALUES (${storageId}, ${filename}, ${mime})
                RETURNING "id"`
        )
      ]
    );

    return { code: 200, msg: { file } };
  },

  pin: 'service:user,command:create,asset:file'
};
