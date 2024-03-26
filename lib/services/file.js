import SQL from 'sql-template-tag';
import * as minioService from './minio.js';
import uuid from 'uuid-random';

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 */
export const createFile = async (pool, minioClient, file) => {
  try {
    const path = file.fields.filePath.value;
    const mime = { type: file.mimetype };
    const objectname = uuid();
    const query = SQL`INSERT INTO "file" ("id", "storageId", "filename", "mime", "path") VALUES
      (${objectname}, '0dbc7c66-1bcf-42be-8ce0-0e1ba6b93ed2', ${file.filename}, ${mime}, ${path})`;

    const {
      rows: [data]
    } = await pool.retry(async (client) => {
      await client.query(query);

      await minioService.uploadFile(minioClient, file, objectname);
      const meta = await minioService.stats(minioClient, objectname);

      const updateQuery = SQL`UPDATE "file" SET "size" = ${meta.size}
        WHERE id = ${objectname} RETURNING id,filename,mime,size`;

      return client.query(updateQuery);
    }, 1);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const getFiles = async (pool, storageId, page = 0, length = 20) => {
  try {
    const query = SQL`SELECT id, filename, size, mime, state, data
      FROM "file" WHERE "storageId" = ${storageId}
      LIMIT ${length} OFFSET ${length * page}`;

    const { rows: data } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const getFileById = async (pool, id) => {
  try {
    const query = SQL`SELECT id, filename, size, mime, state, data
      FROM "file" WHERE "id" = ${id}`;

    const {
      rows: [data]
    } = await pool.query(query);

    return { code: 200, data };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

export const downloadFile = async (pool, minioClient, id) => {
  try {
    const query = SQL`SELECT id, filename, size, mime, state, data
      FROM "file" WHERE "id" = ${id}`;

    const {
      rows: [meta]
    } = await pool.query(query);
    const exists = minioService.exists(minioClient, id);

    if (!exists) throw new Error('File does not exists');

    const readable = await minioService.download(minioClient, id);

    return { code: 200, meta, readable };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {Number} id
 */
export const deleteFile = async (pool, minioClient, id) => {
  await pool.retry(async (client) => {
    const query = SQL`DELETE FROM "file" WHERE "id" = ${id}`;

    await client.query(query);

    await minioService.deleteObject(minioClient, id);
  }, 1);

  return { code: 204 };
};

/**
 * @param {import('pg').Pool} pool
 * @param {import('minio').Client} minioClient
 * @param {Object} payload
 */
export const moveFile = async (pool, minioClient, payload) => {
  const { fileId, updatedPath } = payload;
  await pool.retry(async (client) => {
    const query = SQL`UPDATE "file" SET "path"=${updatedPath} WHERE "id"= ${fileId}`;
    await client.query(query);
  }, 1);

  return { code: 200 };
};
