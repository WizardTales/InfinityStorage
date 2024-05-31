import SQL, { join } from 'sql-template-tag';
import { P_READFILE } from './access.js';
import { getRootDir } from './user.js';
import Promise from 'bluebird';

export async function getObjects (pool, userId, directoryId = null) {
  if (!directoryId) {
    const rootDir = await getRootDir(pool, userId);
    directoryId = rootDir.id;
  }

  const where0 = [
    SQL`fp."userId" = ${userId}`,
    SQL`fp.permissions & (${P_READFILE}) != 0`,
    SQL`f."directoryId" = ${directoryId}`
  ];

  const q0 = SQL`SELECT f.id, f."storageId", f.version, f.filename, f.size, f.mime -> 'type' as mimetype,
  f.state, f.data, f."createdAt", f."updatedAt" FROM "filePermission" fp
  INNER JOIN "file" f ON fp."fileId" = f.id
  ${join(where0, ' AND ', ' WHERE ')}`;

  const q1 = SQL`SELECT d.id, d.name, d.path, d."createdAt", d."updatedAt"
  FROM "directory" d WHERE d."parentId" = ${directoryId}`;

  const [{ rows: files }, { rows: directories }] = await Promise.all([
    pool.query(q0),
    pool.query(q1)
  ]);

  return { files, directories };
}
