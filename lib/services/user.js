import SQL from 'sql-template-tag';

/**
 * @param {import('pg').Pool} pool
 * @param {String} userId
 */
export async function getGlobalRootDir (pool, userId) {
  const q = SQL`SELECT "username" FROM "user" WHERE "id" = ${userId}`;

  const {
    rows: [user]
  } = await pool.query(q);

  if (!user) {
    const ex = new Error('User does not exists');
    ex.code = 404;
    throw ex;
  }

  return user.username ? `/global/${user.username}` : false;
}
