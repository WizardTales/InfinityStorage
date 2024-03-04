import service from '../services/storage.js';
import uuid from 'uuid-random';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createStorage (request, reply) {
    const { pool } = request.server.pg;

    const storage = await service.createStorage(pool, { id: uuid() }, {});

    console.log('controller', storage);

    reply.send(storage);
  }
};
