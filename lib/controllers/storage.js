import service from '../services/storage.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createStorage (request, reply) {
    try {
      const { pool } = request.server.pg;
      const session = request.session;

      const storage = await service.createStorage(pool, session, {});

      reply.send({ code: 200, data: storage });
    } catch (ex) {
      request.log.error(ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.send({ code, msg: ex.message }).code(code);
    }

    return reply;
  },

  async getStoragesByUserId (request, reply) {
    try {
      const { pool } = request.server.pg;
      const userId = request.session.id;

      const storage = await service.getStorageById(pool, userId);
      reply.send({ code: 200, data: storage });
    } catch (ex) {
      request.log.error(ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.send({ code, msg: ex.message }).code(code);
    }

    return reply;
  }
};
