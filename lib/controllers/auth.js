import register from '../services/register.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async challenge (request, h) {
    const authenticator = request.sp;
    const username = request.body.username.toLowerCase();
    const ip = request.ip || '127.0.0.1';

    return authenticator.challenge(username, ip);
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async login (request, reply) {
    const payload = request.body;
    const authenticator = request.sp;
    const username = payload.username.toLowerCase();
    const password = payload.password;
    const ip = request.ip;

    if (request.session?.authenticated) {
      return reply.code(400).send({ code: 400, msg: 'Already logged in!' });
    }

    const result = await authenticator.auth(username, ip, password);

    return reply.send(result);
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async logout (request, reply) {
    await request.session.destroy();
    return reply.send({ message: 'Logged out successfully' });
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async register (request, reply) {
    const { pool } = request.server.pg;
    const username = request.body.username.toLowerCase();
    const password = request.body.password;
    const { agreements } = request.body;
    const ip = request.ip;

    if (request.session.authenticated) {
      return reply.code(400).send({ code: 400, msg: 'Already logged in!' });
    }

    if (!agreements.agb) {
      return reply.code(400).send({ code: 400, msg: 'AGB must be accepted!' });
    }

    const result = await register({ pool, username, password, ip });

    if (result.code) {
      if (result.code === 200) {
        request.session.authenticated = true;
        request.session.user = { id: result.user.id };
      }
    }

    return reply.code(result.code || 500).send(result);
  }
};
