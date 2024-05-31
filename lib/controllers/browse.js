import * as service from '../services/browse.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getObjects (request, reply) {
    try {
      const pool = request.server.pg.pool;
      const userId = request.session?.id;

      if (!userId) {
        return reply.send({ code: 401, msg: 'Unauthorized' }).code(401);
      }

      const data = await service.getObjects(pool, userId, request.params.id);

      return reply.send({ code: 200, data });
    } catch (ex) {
      ex.code = ex.code < 500 ? ex.code : 500;
      reply.log.error(ex.message);
      return reply.send(ex).code(ex.code);
    }
  }
};
