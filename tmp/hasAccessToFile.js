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

    const {
      rows: [permission]
    } = await Promise.all(
      pool.query(
        SQL`SELECT s."ownerId", p."userId" FROM "file" f
            INNER JOIN "storage" s ON (f."storageId" = s."id")
            LEFT JOIN "filePermission" p ON (f."id" = p."fileId"
              AND p."userId" = ${session.id})
            WHERE (f."storageId", f."filename") = (${storageId}, ${filename})
              AND (
                s."ownerId" = ${session.id} OR p."userId" = ${session.id}
              )`
      )
    );

    if (!permission) {
      return { code: 404 };
    }

    return { code: 200, msg: { permission } };
  },

  pin: 'service:user,command:access,asset:file'
};
