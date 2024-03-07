import SQL from 'sql-template-tag';
import s3 from './s3.js';

export default {
  /**
   * @param {import('pg/lib/index.js')} pool
   * @param {import('minio').Client} s3Client
   * @param {import('@fastify/multipart').MultipartFile} file
   */
  createFile: async (pool, s3Client, file) => {
    try {
      const mime = { mimetype: file.mimetype };

      const query = SQL`INSERT INTO "file" ("storageId", "filename", "mime") VALUES
      ('019d5de1-bef1-4b82-928a-caf5f2864f4d', ${file.filename}, ${mime})
      RETURNING id,filename`;

      const fileResponse = await pool.retry(async (client) => {
        const {
          rows: [fileMeta]
        } = await client.query(query);

        return s3.uploadFile(s3Client, file, fileMeta.id);
      }, 1);

      return { code: 200, msg: { file: fileResponse } };
    } catch (err) {
      return { code: 500, msg: err.message };
    }
  }
};
