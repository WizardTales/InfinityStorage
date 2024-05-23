import SQL, { raw } from 'sql-template-tag';
import * as minioService from './minio.js';
import * as dirService from './directory.js';
import * as userService from './user.js';
import {
  P_READFILE,
  P_WRITEFILE,
  P_DELETEFILE,
  hasAccessTo
} from './access.js';
import versionService from './version.js';
import uuid from 'uuid-random';
import config from '../../config.js';
import dayjs from 'dayjs';
import pathPkg from 'path';
import { fileTypeFromStream } from 'file-type';

const { lockDuration } = config.file;

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 * @param {String} storageId
 */
export const createFile = async (
  logger,
  pool,
  minioClient,
  file,
  userId,
  storageId,
  encryptionKey = null
) => {
  try {
    const rootDir = await userService.getRootDir(pool, userId);
    const pathStr = file.fields.fileParent.value;

    // when encryption key is set, there is no need to read the first bytes of
    // the file to dynamically retrieve information. in that case we need to
    // trust the client to provide a proper content-type
    const fileStream = encryptionKey
      ? await fileTypeFromStream(file.file)
      : file.file;
    const mime = { type: fileStream?.mime || file.mimetype };
    const objectname = uuid();

    const fileExists = await getFileByPath(
      pool,
      file.filename,
      pathPkg.join(rootDir.path, pathStr),
      storageId,
      userId
    );

    if (fileExists.code === 200) {
      return {
        code: 400,
        msg: `File ${file.filename} already exists in the location`
      };
    }

    const directory = await dirService.createPath(pool, pathStr, rootDir.id);

    // we execute this first outside the transaction, b/c we need this
    // information to handle failed or aborted uploads
    await pool.query(SQL`INSERT
      INTO "file" ("id", "storageId", "filename", "mime", "directoryId", 
        "extFilename", "encryptionKey")
      VALUES (${objectname}, ${storageId}, ${file.filename}, ${mime}, ${directory.id}, 
        ${objectname}, ${encryptionKey})`);

    await minioService.uploadFile(minioClient, fileStream, objectname);
    const meta = await minioService.stats(minioClient, objectname);

    const {
      rows: [data]
    } = await pool.query(SQL`UPDATE "file" SET "size" = ${meta.size}
      WHERE id = ${objectname} 
      RETURNING "id", "filename", "mime", "size", "directoryId"`);

    await pool.query(SQL`INSERT INTO version
      ("fileId", filename, size, mime, "encryptionKey", "extFilename") VALUES
      (${objectname}, ${file.filename}, ${meta.size}, ${mime},
       ${encryptionKey}, ${objectname})`);

    data.version = 0;

    await pool.query(SQL`INSERT
    INTO "filePermission" ("fileId", "userId", "permissions")
    VALUES (${objectname}, ${userId}, 15)`);

    return { code: 200, data };
  } catch (ex) {
    logger.error(ex.message);
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
  logger,
  pool,
  minioClient,
  fileId,
  file,
  userId,
  storageId,
  encryptionKey = null
) => {
  try {
    if (!(await hasAccessTo(pool, fileId, userId, P_WRITEFILE))) {
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
    const { version: currentVersion } = await versionService.getLatestVersion(
      pool,
      fileId,
      storageId
    );

    await minioService.uploadFile(minioClient, fileStream, objectname);
    const meta = await minioService.stats(minioClient, objectname);
    const newVersion = currentVersion + 1;

    const {
      rows: [data]
    } = await pool.query(SQL`UPDATE "file"
      SET ("size", "mime", "extFilename", "version")
      = (${meta.size}, ${mime}, ${objectname}, ${newVersion})
      WHERE id = ${fileId} 
      RETURNING "id", "filename", "mime", "size", "directoryId"`);

    await pool.query(SQL`INSERT INTO version
      ("fileId", "version", filename, size, mime, "encryptionKey", "extFilename") VALUES
      (${fileId}, ${newVersion}, ${file.filename}, ${meta.size},
        ${mime}, ${encryptionKey}, ${objectname})`);

    data.version = newVersion;

    return { code: 200, data };
  } catch (ex) {
    logger.error(ex.message);
    return { code: 500, msg: ex.message };
  }
};

export const getFiles = async (
  logger,
  pool,
  userId,
  storageId,
  page = 0,
  length = 20
) => {
  try {
    const expireAt = raw(`'NOW()'`);
    const query = SQL`SELECT f.id, f.filename, f.version, f.size, f.mime, f.state, f.data, l."expireAt" as "lockExpiresAt"
      FROM "file" f
      INNER JOIN "filePermission" fp ON fp."fileId" = f.id
      LEFT JOIN "lock" l ON f.id = l."fileId"
      AND l."expireAt" > ${expireAt}
      WHERE f."storageId" = ${storageId}
      AND fp."userId" = ${userId}
      LIMIT ${length} OFFSET ${length * page}`;

    const { rows: data } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    logger.error(ex.message);
    return { code: 500, msg: ex.message };
  }
};

export const getFileById = async (pool, id, version, userId, storageId) => {
  try {
    if (!(await hasAccessTo(pool, id, userId, P_READFILE))) {
      return { code: 403, msg: 'Forbidden access' };
    }

    const data = version
      ? await versionService.getSpecificVersion(pool, id, version, storageId)
      : await versionService.getLatestVersion(pool, id, storageId);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

/**
 * @param {import('pg').Pool} pool
 * @param {String} filename
 * @param {String} pathStr
 * @param {String} storageId
 */
export const getFileByPath = async (
  pool,
  filename,
  pathStr,
  storageId,
  userId
) => {
  const rootDir = await userService.getRootDir(pool, userId);
  const dir = await dirService.getDirByPath(
    pool,
    pathPkg.join(rootDir.path, pathStr)
  );

  if (!dir) {
    return { code: 404, msg: 'Path not found' };
  }

  const q = SQL`SELECT f.id, f.filename, f.version, f.size, f.mime,
    f.state, f.data, f."directoryId", l."expireAt" FROM "file" f
    LEFT JOIN "lock" l ON f.id = l."fileId"
    WHERE f.filename = ${filename}
    AND f."directoryId" = ${dir.id}
    AND f."storageId" = ${storageId}`;

  const {
    rows: [data]
  } = await pool.query(q);

  if (!data) {
    return { code: 404, msg: 'File not found' };
  }

  return { code: 200, data };
};

export const downloadFile = async (
  pool,
  minioClient,
  id,
  version,
  userId,
  storageId
) => {
  try {
    if (!(await hasAccessTo(pool, id, userId, P_READFILE))) {
      return { code: 403, msg: 'Forbidden access' };
    }

    const meta = version
      ? await versionService.getSpecificVersion(pool, id, version, storageId)
      : await versionService.getLatestVersion(pool, id, storageId);

    const exists = await minioService.exists(minioClient, meta.extFilename);
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
  if (!(await hasAccessTo(pool, id, userId, P_DELETEFILE))) {
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
  const rootDir = await userService.getRootDir(pool, userId);

  const exists = await getFileById(pool, id, userId, storageId);

  if (!exists) {
    return { code: 400, msg: 'File does not exists' };
  }

  if (!(await hasAccessTo(pool, id, userId, P_WRITEFILE))) {
    return { code: 403, msg: 'Forbidden access' };
  }

  const { expireAt, filename } = exists.data;

  if (expireAt && dayjs().isBefore(expireAt)) {
    return { code: 400, msg: 'File is locked' };
  }

  const exist = await getFileByPath(
    pool,
    filename,
    updatedPath,
    storageId,
    userId
  );

  if (exist.code === 200) {
    return { code: 400, msg: 'File with same name exists in ' + updatedPath };
  }

  const directory = await dirService.createPath(pool, updatedPath, rootDir.id);

  const data = await pool.retry(async (client) => {
    const query = SQL`UPDATE "file"
      SET "directoryId" = ${directory.id}
      WHERE "id" = ${id}
      AND "storageId" = ${storageId}
      RETURNING *`;

    const {
      rows: [file]
    } = await client.query(query);
    return file;
  }, 1);

  return { code: 204, data };
};

/**
 * @param {import('pg').Pool} pool
 * @param {Object} payload
 */
export const copyFile = async (pool, payload) => {
  const { id, path, storageId, userId } = payload;
  const rootDir = await userService.getRootDir(pool, userId);

  if (!(await hasAccessTo(pool, id, userId, P_WRITEFILE))) {
    const ex = new Error('Forbidden access');
    ex.code = 403;
    throw ex;
  }

  const getQuery = SQL`SELECT filename, mime, size, "directoryId", data, "extFilename"
    FROM "file" WHERE id = ${id} AND "storageId" = ${storageId}`;

  const {
    rows: [oldFile]
  } = await pool.query(getQuery);
  const { filename, data, extFilename, mime, size } = oldFile;

  const exists = await getFileByPath(pool, filename, path, storageId, userId);
  if (exists) {
    const ex = new Error('Filename already exists in path.');
    ex.code = 400;
    throw ex;
  }

  const directory = await dirService.createPath(pool, path, rootDir.id);

  return pool.retry(async (client) => {
    const insertQuery = SQL`INSERT INTO "file"
      (filename, mime, size, "directoryId", data, "extFilename", "storageId") VALUES 
      (${filename}, ${mime}, ${size}, ${directory.id}, ${data}, ${extFilename}, ${storageId})
      RETURNING id, filename, "directoryId", data, state, "createdAt", "updatedAt"`;

    const {
      rows: [nFile]
    } = await client.query(insertQuery);

    return nFile;
  });
};

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
  if (!(await hasAccessTo(pool, id, userId, P_WRITEFILE))) {
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
  if (!(await hasAccessTo(pool, id, userId, P_WRITEFILE))) {
    return { code: 403, msg: 'Forbidden access' };
  }
  const { expireAt } = await findLock(pool, id, storageId);

  if (!expireAt || dayjs().isAfter(expireAt)) {
    return { code: 204, msg: 'File is not locked' };
  }

  await pool.retry(async (client) => {
    const query = SQL`UPDATE lock SET "expireAt" = 'NOW()' WHERE "fileId" = ${id}`;

    return client.query(query);
  }, 3);

  return { code: 200, msg: 'File is unlocked' };
}
