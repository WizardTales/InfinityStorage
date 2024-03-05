import service from '../services/storage.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createStorage (request, reply) {
    const { pool } = request.server.pg;
    const id = request.body.userId;

    const storage = await service.createStorage(pool, { id }, {});

    reply.send(storage);
  }
};
