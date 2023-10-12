'use strict';

import SQL from 'sql-template-tag';
import Promise from 'bluebird';

const names = { ef: 'enforceFilename', am: 'allowedMimeTypes' };
const rName = Object.fromEntries(Object.entries(names).map(([key, value]) => [value, key]));

export default {
  /**
   * @param {Object} request - Request plugin object
   * @param {Object} request.server
   * @param {Object} request.server.plugins
   * @param {Object} request.server.plugins.pg
   * @param {import('pg-pool')} request.server.plugins.pg.pool - CRDB Interface
   */
  request: async (request, data) => {
    const { storageId } = data;
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;

    const {
      rows: [storage]
    } = await pool.query(
      SQL`SELECT s."data", f."id" AS "fileId" FROM "storage" s
        LEFT JOIN "file" f ON (f."storageId" = s."id"
          AND f."filename" = ${data.filename})
        WHERE s."id" = ${storageId}
          AND s."ownerId" = ${session.id}`
    );

    if (!storage) {
      return { code: 404 };
    }

    if (storage.fileId) {
      return { code: 422, msg: 'File exists already!' };
    }

    let x = storage.data[rName.enforceFilename];

    if (x) {
      data.filename = x;

      const {
        rows: [file]
      } = await pool.query(
        SQL`SELECT f.id FROM "file" f
          WHERE f."storageId" = ${storageId} 
          AND f."filename" = ${data.filename}`
      );

      if (file) {
        return { code: 422, msg: 'File exists already!' };
      }
    }

    x = storage.data[rName.allowedMimeTypes];

    if (x && x.indexOf(data.mime.mime) === -1) {
      return { code: 401, msg: 'This Mime Type is not allowed.' };
    }

    return { code: 200, msg: data };
  },

  pin: 'service:user,command:check,asset:storageReq'
};
