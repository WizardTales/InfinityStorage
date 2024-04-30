import SQL, { raw } from 'sql-template-tag';
import * as minioService from './minio.js';
import uuid from 'uuid-random';
import config from '../../config.js';
import dayjs from 'dayjs';

const { lockDuration } = config.file;

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 * @param {String} storageId
 */
export const createFile = async (pool, minioClient, file, storageId) => {
  try {
    const path = file.fields.fileParent.value;
    const mime = { type: file.mimetype };
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

    const query = SQL`INSERT
      INTO "file" ("id", "storageId", "filename", "mime", "path", "extFilename")
      VALUES (${objectname}, ${storageId}, ${file.filename}, ${mime}, ${path}, ${objectname})`;

    const {
      rows: [data]
    } = await pool.retry(async (client) => {
      await client.query(query);

      await minioService.uploadFile(minioClient, file, objectname);
      const meta = await minioService.stats(minioClient, objectname);

      const updateQuery = SQL`UPDATE "file" SET "size" = ${meta.size}
        WHERE id = ${objectname} RETURNING id,filename,mime,size,path`;

      return client.query(updateQuery);
    }, 1);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const getFiles = async (pool, storageId, page = 0, length = 20) => {
  try {
    const query = SQL`SELECT f.id, f.filename, f.size, f.mime, f.state, f.data, l."expireAt" as "lockExpiresAt"
      FROM "file" f
      LEFT JOIN "lock" l ON f.id = l."fileId"
      AND "expireAt" > '${raw(`NOW() - '${lockDuration} seconds'::INTERVAL`)}'
      WHERE f."storageId" = ${storageId}
      LIMIT ${length} OFFSET ${length * page}`;

    const { rows: data } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const getFileById = async (pool, id, storageId) => {
  try {
    const query = SQL`SELECT f.id, f.filename, f.size, f.mime, f.state, f.data, f.path,
      l."expireAt"
      FROM "file" f
      LEFT JOIN "lock" l ON f.id = l."fileId"
      WHERE f."id" = ${id} AND f."storageId" = ${storageId}`;

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

export const downloadFile = async (pool, minioClient, id, storageId) => {
  try {
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
export const deleteFile = async (pool, minioClient, id, storageId) => {
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
  const { id, updatedPath, storageId } = payload;

  const file = await getFileById(pool, id, storageId);

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
  const { id, path, storageId } = payload;

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

export async function lock (pool, id, storageId) {
  const { id: lockId } = await findLock(pool, id, storageId);

  const expireAt = raw(`NOW() + '${lockDuration} seconds'::INTERVAL`);

  await pool.retry(async (client) => {
    let query;
    if (lockId) {
      // extend expiry in case lock already exists
      query = SQL`UPDATE "lock"
        SET "expireAt" = '${expireAt}'
        WHERE id = ${lockId}`;
    } else {
      query = SQL`INSERT INTO "lock" ("fileId", "expireAt")
        VALUES (${id}, '${expireAt}')`;
    }

    await client.query(query);
  }, 3);

  return { code: 200, msg: `File locked for ${lockDuration} seconds` };
}

export async function unlock (pool, id, storageId) {
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
