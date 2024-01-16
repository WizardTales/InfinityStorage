'use strict';

import SQL from 'sql-template-tag';
import Promise from 'bluebird';
import uuid from 'uuid-random';

export default {
  /**
   * @param {Object} request - Request plugin object
   * @param {Object} request.server
   * @param {Object} request.server.plugins
   * @param {Object} request.server.plugins.pg
   * @param {import('pg-pool')} request.server.plugins.pg.pool - CRDB Interface
   */
  request: async (request, { storageId, filename, mime, encryptionKey }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;
    encryptionKey = encryptionKey || null;

    return pool.retry(async (client) => {
      const fileId = uuid();
      const work = [
        client.query(
          SQL`INSERT INTO "file" ("id", "storageId", "filename", "mime", "encryptionKey")
                VALUES (${fileId}, ${storageId}, ${filename}, ${mime})
                RETURNING "id"`
        )
      ];

      // rn a store owner wouldn't need a permission, but individual keys for
      // a user are stored with their permission needs it even for an owner
      if (encryptionKey) {
        work.push(
          client.query(
            SQL`INSERT INTO "filePermission" ("fileId", "userId", "encryptionKey")
                VALUES (${fileId}, ${session.id}, ${encryptionKey})
                RETURNING "id"`
          )
        );
      }

      const [
        {
          rows: [file]
        }
      ] = await Promise.all(work);

      return { code: 200, msg: { file } };
    });
  },

  pin: 'service:user,command:create,asset:file'
};
