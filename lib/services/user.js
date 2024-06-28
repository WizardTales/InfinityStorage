import SQL from 'sql-template-tag';
import crypto from 'crypto';
import rand from 'crypto-random-string';

/**
 * @param {import('pg').Pool} pool
 * @param {String} userId
 */
export async function getRootDir (pool, userId) {
  const q = SQL`SELECT d.* FROM "user" u
  INNER JOIN directory d ON u."globalDirId" = d.id
  WHERE u."id" = ${userId}`;

  const {
    rows: [directory]
  } = await pool.query(q);

  if (!directory) {
    const ex = new Error('User does not exists');
    ex.code = 404;
    throw ex;
  }

  return directory;
}

export async function getById (pool, userId) {
  const q = SQL`SELECT * FROM "user" WHERE id = ${userId}`;

  const {
    rows: [user]
  } = await pool.query(q);

  if (!user) {
    const ex = new Error('User not found');
    ex.code = 404;
    throw ex;
  }

  delete user.__dbmigrate__flag;

  return user;
}

export async function updatePassword (pool, log, userId, password) {
  const salt = rand({ length: 32 });

  const hash = crypto
    .createHash('sha512')
    .update(`${password.toUpperCase()}${salt}`)
    .digest('hex');

  const q = SQL`UPDATE "user"
  SET hash = ${hash}, salt = ${salt}
  WHERE id = ${userId}`;

  log.debug(q.inspect(), 'UPDATE password');

  await pool.query(q);
}
