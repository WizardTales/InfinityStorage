import SQL from 'sql-template-tag';

export const P_READFILE = 1;
export const P_WRITEFILE = 1 << 1;
export const P_DELETEFILE = 1 << 2;
export const P_GRANTFILE = 1 << 3;

export async function addAccessMode (pool, fileId, userId, ownerId, access) {
  await _checkGrantAccess(pool, fileId, ownerId);

  let permission = await getAccessMode(pool, fileId, userId);

  permission |= access;

  await _putAccessMode(pool, fileId, userId, permission);
}

export async function removeAccessMode (pool, fileId, userId, ownerId, access) {
  await _checkGrantAccess(pool, fileId, ownerId);

  let permission = await getAccessMode(pool, fileId, userId);

  permission &= ~access;

  await _putAccessMode(pool, fileId, userId, permission);
}

export async function getAccessMode (pool, fileId, userId) {
  const q = SQL`SELECT permissions FROM "filePermission"
    WHERE "fileId" = ${fileId} AND "userId" = ${userId}`;

  const {
    rows: [p]
  } = await pool.query(q);

  return p?.permissions || 0;
}

export async function hasAccessTo (pool, fileId, userId, accessMode) {
  const access = await getAccessMode(pool, fileId, userId);

  return !!(access & accessMode);
}

async function _putAccessMode (pool, fileId, userId, access) {
  const q = SQL`INSERT INTO "filePermission" ("fileId", "userId", "permissions")
    VALUES (${fileId}, ${userId}, ${access})
    ON CONFLICT ("fileId", "userId") DO UPDATE
    SET permissions = excluded.permissions`;

  await pool.query(q);
}

async function _checkGrantAccess (pool, fileId, userId) {
  const permission = await getAccessMode(pool, fileId, userId);

  if (!(permission & P_GRANTFILE)) {
    const ex = new Error('Forbidden access to grant permission');
    ex.code = 403;
    throw ex;
  }
}
