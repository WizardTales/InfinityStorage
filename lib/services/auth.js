import SQL, { raw } from 'sql-template-tag';

export default {
  /**
   * @param {import('pg').Pool} pool
   * @param {*} session
   * @param {*} rules
   */
  loginCheck: async (pool, payload) => {
    try {
      const { username, password } = payload;
      const query = SQL`SELECT * FROM "user" WHERE "username" = ${username} AND "hash" = crypt(${password}, hash)`;
      const { rows: response } = await pool.query(query);
      if (response.length > 0) {
        return { code: 200, msg: response };
      } else {
        return { code: 404, msg: 'Not found!!' };
      }
    } catch (error) {
      return { code: 500, msg: error.message, error };
    }
  }
};
