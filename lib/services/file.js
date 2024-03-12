import SQL from 'sql-template-tag';
import * as minioService from './minio.js';
import uuid from 'uuid-random';

/**
 * @param {import('pg/lib/index.js')} pool
 * @param {import('minio').Client} minioClient
 * @param {import('@fastify/multipart').MultipartFile} file
 */
export const createFile = async (pool, minioClient, file) => {
  try {
    const mime = { type: file.mimetype };
    const objectname = uuid();
    const query = SQL`INSERT INTO "file" ("id", "storageId", "filename", "mime") VALUES
      (${objectname}, '019d5de1-bef1-4b82-928a-caf5f2864f4d', ${file.filename}, ${mime})`;

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

export const downloadFile = async (pool, minioCient, id) => {
  try {
    const query = SQL`SELECT id, filename, size, mime, state, data
      FROM "file" WHERE "id" = ${id}`;

    const {
      rows: [meta]
    } = await pool.query(query);
    const exists = minioService.exists(minioCient, id);

    if (!exists) throw new Error('File does not exists');

    const readable = await minioService.download(minioCient, id);

    return { code: 200, meta, readable };
  } catch (ex) {
    return { code: 500, msg: ex.message };
  }
};
