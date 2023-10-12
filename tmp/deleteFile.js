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
  request: async (request, { id, finalize = false }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;

    return pool.retry(async client => {
      const { rows: [file] } = await client.query(SQL`SELECT f.* FROM "file" f
        INNER JOIN "storage" s ON (s."id" = f."storageId")
        LEFT JOIN "filePermission" p ON (p."fileId" = f."id"
          AND p."userId" = ${session.id})
        WHERE f."id" = ${id} AND "state" IN (0, 2) AND (
          s."ownerId" = ${session.id} OR p."userId" = ${session.id}
        )`);

      if (!file) {
        return { code: 404, msg: 'Not found' };
      }

      if (!finalize) {
        await client.query(SQL`UPDATE "file" SET "state" = 2
          WHERE "id" = ${id}`);
      } else {
        await client.query(SQL`DELETE FROM "file"
          WHERE "id" = ${id}`);
      }

      return { code: 200, msg: file };
    });
  },

  pin: 'service:user,command:delete,asset:file'
};
