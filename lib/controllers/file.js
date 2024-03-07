import service from '../services/file.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createFile (request, reply) {
    const { pool } = request.server.pg;

    const s3Client = request.server.s3;

    const data = await request.file();

    const file = await service.createFile(pool, s3Client, data);

    reply.send(file);
  }
};
