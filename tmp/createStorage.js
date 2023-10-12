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
  request: async (request, { client, rules = {} }) => {
    const { credentials: session } = request.auth;
    const { pool } = request.server.plugins.pg;
    if (!client) client = pool;

    const data = {};

    if (rules.enforceFilename) {
      data.ef = rules.enforceFilename;
    }

    if (rules.allowedMimeTypes) {
      data.am = rules.allowedMimeTypes;
    }

    const {
      rows: [storage]
    } = await client.query(
      SQL`INSERT INTO "storage" ("ownerId", "data")
        VALUES (${session.id}, ${data})
        RETURNING "id"`
    );

    return { code: 200, msg: { storage } };
  },

  pin: 'service:user,command:create,asset:storage'
};
