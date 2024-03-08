import service from '../services/auth.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async login_request (request, reply) {
    const { pool } = request.server.pg;
    const payload = request.body;
    const result = await service.loginCheck(pool, payload);

    if (result.code === 200) {
      request.session.set('user', result.msg[0].id);
      // request.cookieAuth.set({ id: result.msg[0].id });
      reply.send({ code: result.code, message: 'Login successful' });
    } else {
      reply.send({ code: result.code, message: 'Invalid credentials' });
    }
  },

  async logout_request (request, reply) {
    request.session.destroy();
    reply.send({ message: 'Logged out successfully' });
  }
};
