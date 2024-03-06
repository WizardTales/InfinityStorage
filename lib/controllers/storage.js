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
  },

  async getStoragesByUserId (request, reply) {
    const { pool } = request.server.pg;
    const userId = request.params.userId;
    if (!userId) {
      reply.send({ code: 400, msg: 'Missing parameter' });
    }
    const storage = await service.getStorageById(pool, userId);
    reply.send(storage);
  }
};
