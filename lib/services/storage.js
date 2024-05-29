import SQL from 'sql-template-tag';

export default {
  /**
   * @param {import('pg').Pool} pool
   * @param {*} session
   * @param {*} rules
   */
  createStorage: async (pool, session, rules) => {
    const data = {};

    if (rules.enforceFilename) {
      data.ef = rules.enforceFilename;
    }

    if (rules.allowedMimeTypes) {
      data.am = rules.allowedMimeTypes;
    }

    const query = SQL`INSERT INTO "storage" ("ownerId", "data")
    VALUES (${session.id}, ${JSON.stringify(data)})
    RETURNING "id"`;

    const {
      rows: [storage]
    } = await pool.query(query);

    return storage;
  },

  getStorageById: async (pool, storageId) => {
    const query = SQL`SELECT id, "ownerId", data, "createdAt", "updatedAt"
      FROM "storage" WHERE "id" = ${storageId}`;

    const {
      rows: [storage]
    } = await pool.query(query);

    return storage;
  }
};
