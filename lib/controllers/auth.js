import register from '../services/register.js';
import config from '../../config.js';
import SQL from 'sql-template-tag';

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

    if (request.session?.id) {
      return reply.code(400).send({ code: 400, msg: 'Already logged in!' });
    }

    const result = await authenticator.auth(username, ip, password);
    if (result.auth === true && result.code === 200) {
      const { pool } = request.server.pg;
      const {
        rows: [user]
      } = await pool.query(
        SQL`SELECT "id", "username" 
        FROM "user" WHERE "username" = ${username}`
      );
      await reply
        .setCookie(config.cookies.cookie, { id: user.id }, { encrypted: true })
        .catch(request.log.error);

      return reply.send({
        ...result,
        user
      });
    }

    return reply.send(result);
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async logout (request, reply) {
    await reply.clearCookie(config.cookies.cookie);
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

    if (request.session?.id) {
      return reply.code(400).send({ code: 400, msg: 'Already logged in!' });
    }

    if (!agreements.agb) {
      return reply.code(400).send({ code: 400, msg: 'AGB must be accepted!' });
    }

    const { code, data, msg } = await register({
      pool,
      username,
      password,
      ip
    });

    if (code === 200) {
      await reply
        .setCookie(config.cookies.cookie, { id: data.id }, { encrypted: true })
        .catch(request.log.error);
    }

    return reply.code(code || 500).send({ code, data, msg });
  }
};
