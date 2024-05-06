import SQL from 'sql-template-tag';

export const hasAccess = async function (pool, userId, fileId, storageId) {
  const query = SQL`SELECT s."ownerId", p."userId", p."permissions" FROM "file" f
    INNER JOIN "storage" s ON (f."storageId" = s."id")
    LEFT JOIN "filePermission" p ON (f."id" = p."fileId"
      AND p."userId" = ${userId})
    WHERE (f."storageId", f."id") = (${storageId}, ${fileId})
      AND (
        s."ownerId" = ${userId} OR p."userId" = ${userId}
      )`;

  const {
    rows: [permission]
  } = await pool.query(query);

  return !!permission.permissions;
};

export const grantAccess = async function (pool, userId, fileId, storageId) {
  const query = SQL`INSERT INTO "filePermission" ("fileId", "userId", "permissions")
    VALUES (${fileId}, ${userId}, 1)
    ON CONFLICT ("fileId", "userId")
    DO UPDATE SET "permissions" = excluded.permissions
    RETURNING "id", "fileId", "userId", "encryptionKey", "permissions"`;

  const {
    rows: [permission]
  } = await pool.query(query);

  return { code: 200, permission };
};

export const revokeAccess = async function (pool, userId, fileId, storageId) {
  if (!(await hasAccess(pool, userId, fileId, storageId))) {
    return { code: 200, msg: 'Nothing to do' };
  }

  const query = SQL`UPDATE "filePermission"
    SET permissions = 0
    WHERE "userId" = ${userId}
    AND "fileId" = ${fileId}
    RETURNING "id", "fileId", "userId", "encryptionKey", "permissions"`;

  const {
    rows: [permission]
  } = await pool.query(query);

  return { code: 200, permission };
};
