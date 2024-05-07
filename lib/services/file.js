import SQL, { raw } from 'sql-template-tag';
import * as minioService from './minio.js';
import { hasAccess } from './permission.js';
import versionService from './version.js';
import uuid from 'uuid-random';
import config from '../../config.js';
import dayjs from 'dayjs';
import { fileTypeFromStream } from 'file-type';

const { lockDuration } = config.file;

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 * @param {String} storageId
 */
export const createFile = async (
  pool,
  minioClient,
  file,
  userId,
  storageId,
  encryptionKey = null
) => {
  try {
    const path = file.fields.fileParent.value;

    // when encryption key is set, there is no need to read the first bytes of
    // the file to dynamically retrieve information. in that case we need to
    // trust the client to provide a proper content-type
    const fileStream = encryptionKey
      ? await fileTypeFromStream(file.file)
      : file.file;
    const mime = { type: fileStream?.mime || file.mimetype };
    const objectname = uuid();

    const existsFile = await getFileByNameAndPath(
      pool,
      storageId,
      file.filename,
      path
    );

    if (existsFile) {
      return {
        code: 400,
        msg: `File ${file.filename} already exists in the location`
      };
    }

    // we execute this first outside the transaction, b/c we need this
    // information to handle failed or aborted uploads
    await pool.query(SQL`INSERT
      INTO "file" ("id", "storageId", "filename", "mime", "path", 
        "extFilename", "encryptionKey")
      VALUES (${objectname}, ${storageId}, ${file.filename}, ${mime}, ${path}, 
        ${objectname}, ${encryptionKey})`);

    await minioService.uploadFile(minioClient, fileStream, objectname);
    const meta = await minioService.stats(minioClient, objectname);

    const {
      rows: [data]
    } = await pool.query(SQL`UPDATE "file" SET "size" = ${meta.size}
      WHERE id = ${objectname} 
      RETURNING "id", "filename", "mime", "size", "path"`);

    await pool.query(SQL`INSERT INTO version
      ("fileId", filename, size, mime, "encryptionKey", path, "extFilename") VALUES
      (${objectname}, ${file.filename}, ${meta.size}, ${mime},
       ${encryptionKey}, ${path}, ${objectname})`);

    data.version = 0;

    await pool.query(SQL`INSERT
    INTO "filePermission" ("fileId", "userId", "permissions")
    VALUES (${objectname}, ${userId}, 1)`);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 * @param {String} storageId
 */
export const updateFile = async (
  pool,
  minioClient,
  fileId,
  file,
  userId,
  storageId,
  encryptionKey = null
) => {
  try {
    if (!(await hasAccess(pool, userId, fileId, storageId))) {
      return { code: 403, msg: 'Forbidden access' };
    }

    const lock = await findLock(pool, fileId, storageId);

    if (lock && dayjs().isAfter(lock.expireAt)) {
      return { code: 403, msg: 'File is locked' };
    }

    const fileStream = encryptionKey
      ? await fileTypeFromStream(file.file)
      : file.file;
    const mime = { type: fileStream?.mime || file.mimetype };
    const objectname = uuid();
    const { version: latestVersion } = await versionService.getLatestVersion(
      pool,
      fileId,
      storageId
    );

    await minioService.uploadFile(minioClient, fileStream, objectname);
    const meta = await minioService.stats(minioClient, objectname);

    const {
      rows: [data]
    } = await pool.query(SQL`UPDATE "file"
      SET ("size", "mime", "extFilename")
      = (${meta.size}, ${mime}, ${objectname})
      WHERE id = ${fileId} 
      RETURNING "id", "filename", "mime", "size", "path"`);

    await pool.query(SQL`INSERT INTO version
      ("fileId", "version", filename, size, mime, "encryptionKey", path, "extFilename") VALUES
      (${fileId}, ${latestVersion + 1}, ${file.filename}, ${meta.size},
        ${mime}, ${encryptionKey}, ${data.path}, ${objectname})`);

    data.version = latestVersion + 1;

    return { code: 200, data };
  } catch (ex) {
    console.trace(ex);
    return { code: 500, msg: ex.message };
  }
};

export const getFiles = async (
  pool,
  userId,
  storageId,
  page = 0,
  length = 20
) => {
  try {
    const expireAt = raw(`'NOW()'`);
    const query = SQL`SELECT f.id, f.filename, f.size, f.mime, f.state, f.data, l."expireAt" as "lockExpiresAt"
      FROM "file" f
      INNER JOIN "filePermission" fp ON fp."fileId" = f.id
      LEFT JOIN "lock" l ON f.id = l."fileId"
      AND "expireAt" > ${expireAt}
      WHERE f."storageId" = ${storageId}
      AND fp."userId" = ${userId}
      LIMIT ${length} OFFSET ${length * page}`;

    const { rows: data } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const getFileById = async (pool, id, userId, storageId) => {
  try {
    if (!(await hasAccess(pool, userId, id, storageId))) {
      return { code: 403, msg: 'Forbidden access' };
    }

    const query = SQL`SELECT max(v.version) as "latestVersion",
      f.id, f.filename, f.size, f.mime, f.state, f.data, f.path,
      l."expireAt", f."encryptionKey"
      FROM "file" f
      INNER JOIN version v ON v."fileId" = f.id
      LEFT JOIN "lock" l ON f.id = l."fileId"
      WHERE f."id" = ${id} AND f."storageId" = ${storageId}
      GROUP BY (f.id, l."expireAt")`;

    const {
      rows: [data]
    } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

/**
 * @param {import('pg').Pool} pool
 * @param {String} path
 * @param {String} filename
 * @param {String} storageId
 */
export const getFileByNameAndPath = async (
  pool,
  storageId,
  filename,
  path = '/'
) => {
  const q = SQL`SELECT f.id, f.filename, f.size, f.mime, f.state, f.data, f.path,
    l."expireAt" FROM "file" f
    LEFT JOIN "lock" l ON f.id = l."fileId"
    WHERE f.filename = ${filename} AND f.path = ${path} AND f."storageId" = ${storageId}`;

  const {
    rows: [file]
  } = await pool.query(q);

  return file;
};

export const downloadFile = async (
  pool,
  minioClient,
  id,
  userId,
  storageId
) => {
  try {
    if (!(await hasAccess(pool, userId, id, storageId))) {
      return { code: 403, msg: 'Forbidden access' };
    }

    const query = SQL`SELECT f.id, f.filename, f.size, f.mime, f.state, f.data, 
      f."extFilename" FROM "file" f
      WHERE f."id" = ${id} AND f."storageId" = ${storageId}`;

    const {
      rows: [meta]
    } = await pool.query(query);
    const exists = minioService.exists(minioClient, id);

    if (!exists) throw new Error('File does not exists');

    const readable = await minioService.download(minioClient, meta.extFilename);

    return { code: 200, meta, readable };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {Number} id
 * @param {String} storageId
 */
export const deleteFile = async (pool, minioClient, id, userId, storageId) => {
  if (!(await hasAccess(pool, userId, id, storageId))) {
    return { code: 403, msg: 'Forbidden access' };
  }

  const query = SQL`SELECT f."extFilename", l."expireAt" FROM "file" f
    LEFT JOIN "lock" l ON f.id = l."fileId"
    WHERE f.id = ${id}`;
  const { rows } = await pool.query(query);

  if (!rows.length) {
    return { code: 404, msg: 'File not found' };
  }

  const { extFilename, expireAt } = rows[0];

  if (expireAt && dayjs().isBefore(expireAt)) {
    return { code: 400, msg: 'File is locked' };
  }

  await pool.retry(async (client) => {
    const query = SQL`DELETE FROM "file" WHERE "id" = ${id}`;
    await client.query(query);
  }, 1);

  // DELETE actual file in case of no references left;
  const queryChk = SQL`SELECT id FROM "file"
    WHERE "extFilename" = ${extFilename}
    AND "storageId" = ${storageId}`;
  const { rows: list } = await pool.query(queryChk);

  if (!list.length) await minioService.deleteObject(minioClient, extFilename);

  return { code: 204 };
};

/**
 * @param {import('pg').Pool} pool
 * @param {Object} payload
 */
export const moveFile = async (pool, payload) => {
  const { id, updatedPath, storageId, userId } = payload;

  const file = await getFileById(pool, id, userId, storageId);

  if (!file) {
    return { code: 400, msg: 'File does not exists' };
  }

  const { expireAt, filename } = file.data;

  if (expireAt && dayjs().isBefore(expireAt)) {
    return { code: 400, msg: 'File is locked' };
  }

  const existFile = await getFileByNameAndPath(
    pool,
    storageId,
    filename,
    updatedPath
  );

  if (existFile) {
    return { code: 400, msg: 'File with same name exists in the new path' };
  }

  await pool.retry(async (client) => {
    const query = SQL`UPDATE "file" SET "path"=${updatedPath}
      WHERE "id"= ${id} AND "storageId" = ${storageId}`;
    await client.query(query);
  }, 1);

  return { code: 204 };
};

/**
 * @param {import('pg').Pool} pool
 * @param {Object} payload
 */
export const copyFile = async (pool, payload) => {
  const { id, path, storageId, userId } = payload;

  if (!(await hasAccess(pool, userId, id, storageId))) {
    const ex = new Error('Forbidden access');
    ex.code = 403;
    throw ex;
  }

  const getQuery = SQL`SELECT filename, mime, size, path, data, "extFilename"
    FROM "file" WHERE id = ${id} AND "storageId" = ${storageId}`;

  const {
    rows: [oldFile]
  } = await pool.query(getQuery);
  const { filename, data, extFilename, mime, size } = oldFile;

  if (await checkFilenameExistsInPath(pool, storageId, filename, path)) {
    const ex = new Error('Filename already exists in path.');
    ex.code = 400;
    throw ex;
  }

  return pool.retry(async (client) => {
    const insertQuery = SQL`INSERT INTO "file"
      (filename, mime, size, path, data, "extFilename", "storageId") VALUES 
      (${filename}, ${mime}, ${size}, ${path}, ${data}, ${extFilename}, ${storageId})
      RETURNING id, filename, path, data, state, "createdAt", "updatedAt"`;

    const {
      rows: [nFile]
    } = await client.query(insertQuery);

    return nFile;
  });
};

async function checkFilenameExistsInPath (pool, storageId, filename, path) {
  const checkQuery = SQL`SELECT id from file
    WHERE "storageId" = ${storageId} AND filename = ${filename}
    AND path = ${path}`;

  const { rows } = await pool.query(checkQuery);

  return rows.length > 0;
}

export async function findLock (pool, fileId, storageId) {
  const query = SQL`SELECT l.* FROM file f
  LEFT JOIN "lock" l ON l."fileId" = f.id
  WHERE f.id = ${fileId} AND f."storageId" = ${storageId}`;

  const {
    rows: [lock]
  } = await pool.query(query);

  return lock;
}

export async function lock (pool, id, userId, storageId) {
  if (!(await hasAccess(pool, userId, id, storageId))) {
    return { code: 403, msg: 'Forbidden access' };
  }
  const { id: lockId } = await findLock(pool, id, storageId);

  const expireAt = raw(`'NOW()' + '${lockDuration} s'::INTERVAL`);

  await pool.retry(async (client) => {
    let query;
    if (lockId) {
      // extend expiry in case lock already exists
      query = SQL`UPDATE "lock"
        SET "expireAt" = ${expireAt}
        WHERE id = ${lockId}`;
    } else {
      query = SQL`INSERT INTO "lock" ("fileId", "expireAt")
        VALUES (${id}, ${expireAt})`;
    }

    await client.query(query);
  }, 3);

  return { code: 200, msg: `File locked for ${lockDuration} seconds` };
}

export async function unlock (pool, id, userId, storageId) {
  if (!(await hasAccess(pool, userId, id, storageId))) {
    return { code: 403, msg: 'Forbidden access' };
  }
  const { expireAt } = await findLock(pool, id, userId, storageId);

  if (!expireAt || dayjs().isAfter(expireAt)) {
    return { code: 204, msg: 'File is not locked' };
  }

  await pool.retry(async (client) => {
    const query = SQL`UPDATE lock SET "expireAt" = 'NOW()' WHERE "fileId" = ${id}`;

    return client.query(query);
  }, 3);

  return { code: 200, msg: 'File is unlocked' };
}
