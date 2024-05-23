import SQL from 'sql-template-tag';

/**
 * @param {import('pg').Pool} pool
 * @param {String} userId
 */
export async function getRootDir (pool, userId) {
  const q = SQL`SELECT d.* FROM "user" u
  INNER JOIN directory d ON u."globalDirId" = d.id
  WHERE u."id" = ${userId}`;

  const {
    rows: [directory],
    rowCount
  } = await pool.query(q);

  if (!directory) {
    console.log(rowCount, q.inspect());
    const ex = new Error('User does not exists');
    ex.code = 404;
    throw ex;
  }

  return directory;
}
