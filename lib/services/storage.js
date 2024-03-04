import SQL, { raw } from 'sql-template-tag';

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
      // const query = SQL`INSERT INTO "storage" ("ownerId", "data")
      // VALUES (${session.id}, ${JSON.stringify(data)})
      // RETURNING "id"`;

      const query = SQL`SELECT * FROM "storage"`;

      console.log('inspect', query.inspect(), pool.options);

      const storage = await pool.query(query);

      console.log('services', storage);

      return { code: 200, msg: { storage } };
    } catch (err) {
      console.error(err);
      return { code: 500, msg: err.message };
    }
  }
};
