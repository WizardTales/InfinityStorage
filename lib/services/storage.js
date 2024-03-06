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

    try {
      const query = SQL`INSERT INTO "storage" ("ownerId", "data")
      VALUES (${session.id}, ${JSON.stringify(data)})
      RETURNING "id"`;

      const {
        rows: [storage]
      } = await pool.query(query);

      return { code: 200, msg: { storage } };
    } catch (err) {
      return { code: 500, msg: err.message, err };
    }
  },

  getStorageById: async (pool, userId) => {
    try {
      const query = SQL`SELECT * FROM "storage" WHERE "ownerId" = ${userId}`;
      const { rows: storage } = await pool.query(query);
      return { code: 200, msg: storage };
    } catch (error) {
      return { code: 500, msg: error.message, error };
    }
  }
};
