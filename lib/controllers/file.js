import * as service from '../services/file.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createFile (request, reply) {
    const { pool } = request.server.pg;

    const minioCient = request.server.s3;

    const data = await request.file();

    if (data === undefined) { return reply.send({ message: 'No file found!!' }).code(400); }

    function isValidFilePath (filePath, file) {
      // Filepath string can only consist of "/"
      if (filePath === '/') {
        return true;
      }

      // Filepath string should start with "/"
      if (!filePath.startsWith('/')) {
        return false;
      }

      // Filepath string cannot start/end/have with *
      if (
        filePath.includes('*') ||
        filePath.endsWith('*') ||
        filePath.endsWith('/')
      ) {
        return false;
      }

      // Extract the filename from the filepath
      const filename = filePath.split('/').pop();

      // Filepath string should end with the file name
      if (filename !== file.filename && file.type === 'file') {
        return false;
      }

      // All rules passed, filepath is valid
      return true;
    }

    if (!isValidFilePath(data.fields.filePath.value, data)) {
      return reply.send({ message: 'Invalid file path' }).code(400);
    }

    reply.send(await service.createFile(pool, minioCient, data));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFiles (request, reply) {
    const { pool } = request.server.pg;
    const { storageId, page, length } = request.query;

    reply.send(await service.getFiles(pool, storageId, page, length));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFileById (request, reply) {
    const { pool } = request.server.pg;
    const { id } = request.params;

    reply.send(await service.getFileById(pool, id));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async downloadFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { id } = request.params;

    const { code, meta, readable, msg } = await service.downloadFile(
      pool,
      minioCient,
      id
    );

    if (code === 200) {
      reply.headers({
        'Content-Type': meta.mime.type,
        'Content-Disposition': `attachment; filename=${meta.filename}`,
        'Content-Length': `${meta.size}`
      });
      reply.send(readable);
    } else {
      reply.send({ code, msg }).code(code || 500);
    }

    return reply;
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { id } = request.params;

    const { code } = await service.deleteFile(pool, minioCient, id);

    return reply.send({ code });
  }
};
