import path from 'path';
import SQL, { join, raw } from 'sql-template-tag';

/**
 * @param {import('pg').Pool} pool
 * @param {String} name
 * @param {String} parentId
 */
export async function create (pool, name, parentId = null) {
  if (await exists(pool, name, parentId)) {
    const err = new Error('Directory already exists');
    err.code = 409;
    throw err;
  }

  let path = `/${name}`;

  if (parentId) {
    const parent = await getById(pool, parentId);
    path = parent.path + path;
  }

  const q = SQL`INSERT INTO directory ("name", "parentId", "path")
    VALUES (${name}, ${parentId}, ${path}) RETURNING *`;

  const {
    rows: [directory]
  } = await pool.query(q);

  return directory;
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} name
 * @param {String} parentId
 */
export async function exists (pool, name, parentId = null) {
  const WHERE = [SQL`name = ${name}`];

  if (parentId) {
    WHERE.push(SQL`"parentId" = ${parentId}`);
  }

  const q = SQL`SELECT id FROM directory
    ${join(WHERE, ' AND ', ' WHERE ')}`;

  const { rows } = await pool.query(q);

  return !!rows.length;
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} name
 * @param {String} parentId
 */
export async function get (pool, name, parentId = null) {
  const WHERE = [SQL`name = ${name}`];

  if (parentId) {
    WHERE.push(SQL`"parentId" = ${parentId}`);
  }

  const q = SQL`SELECT id, name, "parentId", path, "createdAt", "updatedAt"
    FROM directory ${join(WHERE, ' AND ', ' WHERE ')}`;

  const {
    rows: [dir]
  } = await pool.query(q);

  return dir;
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} name
 * @param {String} parentId
 */
export async function getById (pool, id) {
  const q = SQL`SELECT id, name, "parentId", path, "createdAt", "updatedAt"
    FROM directory WHERE id = ${id}`;

  const {
    rows: [dir]
  } = await pool.query(q);

  return dir;
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} pathStr
 * @param {String} parentId
 */
export async function createPath (pool, pathStr, parentId = null) {
  const dirArr = pathStr
    .trim()
    .split(path.sep)
    .filter((dirname) => dirname);

  let nextDirname = dirArr.shift();
  let parent = false;
  while (nextDirname) {
    const currentDir = await get(pool, nextDirname, parent?.id || parentId);

    if (!currentDir) {
      break;
    }

    parent = currentDir;
    nextDirname = dirArr.shift();
  }

  if (nextDirname) {
    for (const dirname of [nextDirname, ...dirArr]) {
      parent = await create(pool, dirname, parent?.id || parentId);
    }
  }

  return parent;
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} pathStr
 */
export async function getDirByPath (pool, pathStr) {
  try {
    const q = SQL`SELECT id, name, "parentId", path, "createdAt", "updatedAt"
      FROM "directory" WHERE path = ${pathStr}`;

    const {
      rows: [dir]
    } = await pool.query(q);

    return dir;
  } catch (ex) {
    return false;
  }
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} pathStr
 */
export async function existsPath (pool, pathStr) {
  return !!(await getDirByPath(pool, pathStr));
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} name
 * @param {String} parentId
 */
export async function remove (pool, name, parentId = null) {
  const WHERE = [SQL`name = ${name}`];

  if (parentId) {
    WHERE.push(SQL`"parentId" = ${parentId}`);
  }

  const q = SQL`DELETE FROM directory ${join(WHERE, ' AND ', ' WHERE ')}`;

  await pool.query(q);
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} id
 */
export async function removeById (pool, id) {
  const q = SQL`DELETE FROM directory WHERE id = ${id}`;

  await pool.query(q);
}

/**
 * @param {import('pg').Pool} pool
 * @param {String} id
 */
export async function move (pool, id, newParentId = null) {
  const q0 = SQL`SELECT path from directory WHERE id = ${newParentId}`;

  const {
    rows: [newParent]
  } = await pool.query(q0);

  const newPath = raw(`'${newParent.path}' || '/' || "name"`);

  const q = SQL`UPDATE directory
    SET "parentId" = ${newParentId}, path = ${newPath}
    WHERE id = ${id} RETURNING *`;

  const {
    rows: [directory]
  } = await pool.query(q);

  return directory;
}
