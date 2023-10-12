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
  request: async (request, { id }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;

    const { rows: [file] } = await pool.query(SQL`SELECT f.* FROM "file" f
      INNER JOIN "storage" s ON (s."id" = f."storageId")
      LEFT JOIN "filePermission" p ON (p."fileId" = f."id"
        AND p."userId" = ${session.id})
      WHERE f."id" = ${id} AND "state" = 0 AND (
        s."ownerId" = ${session.id} OR p."userId" = ${session.id}
      )`);

    return { code: 200, msg: file };
  },

  pin: 'service:user,command:get,asset:file'
};
