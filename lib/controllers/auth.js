import service from '../services/auth.js';
import challenge from '../../tmp/challenge.js';
import auth from '../../tmp/auth.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */

  async challenge_request (request, h) {
    // we only use mail for auth, which we need to require to be lower case
    const username = request.payload.username.toLowerCase();
    console.log('1', username);
    const ip = request.socket.remoteAddress || '127.0.0.1';
    console.log('2', ip);
    // const result = await request.seneca.actAsync(
    //   'service:user,command:challenge',
    //   { data: { username, ip } }
    // );

    const result = await challenge.request({ data: { username, ip } });

    if (result.code) {
      return h.response(result).code(result.code);
    }

    return result;
  },

  async login_request (request, reply) {
    const { pool } = request.server.pg;
    const payload = request.body;

    const username = request.body.username.toLowerCase();
    console.log('10', username);
    const { password } = request.body;
    const ip = request.socket.remoteAddress;
    console.log('11', ip);

    const authenticator = request.sp;
    console.log('Helloo ', authenticator.auth);

    const result1 = await authenticator.auth(username, ip, password);
    console.log('result', result1);

    // const result = await auth.request(pool, { username, ip, password });
    // const result = await service.loginCheck(pool, payload);

    // if (result.code === 200) {
    //   request.session.set('user', result.msg[0].id);
    //   // request.cookieAuth.set({ id: result.msg[0].id });
    //   reply.send({ code: result.code, message: 'Login successful' });
    // } else {
    //   reply.send({ code: result.code, message: 'Invalid credentials' });
    // }
  },

  async logout_request (request, reply) {
    request.session.destroy();
    reply.send({ message: 'Logged out successfully' });
  }
};
