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
  request: async (request, { id, state }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;

    const [{
      rows: [file]
    }] = await Promise.all(
      [
        pool.query(
          SQL`UPDATE "file" SET "state" = ${state}
            WHERE "id" = ${id}`
        )
      ]
    );

    return { code: 200, msg: { file } };
  },

  pin: 'service:user,command:update,asset:file'
};
