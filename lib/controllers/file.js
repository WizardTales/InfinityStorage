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
      reply.send({ code, msg });
    }

    return reply;
  }
};
