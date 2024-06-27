import * as passwdReset from '../services/resetPassword.js';
import * as emailVerify from '../services/emailVerification.js';
import * as userSerivice from '../services/user.js';

export default {
  async requestEmailVerification (request, reply) {
    try {
      const pool = request.server.pg.pool;
      const userId = request.session.id;
      const log = request.log;

      await emailVerify.sendLink(pool, log, userId);
      return reply.send({
        code: 200,
        msg: 'Email verification link is sent to your email'
      });
    } catch (ex) {
      request.log.error(ex.trace, ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.code(code).send({ code, msg: ex.message });
    }
  },
  async verifyEmail (request, reply) {
    try {
      const pool = request.server.pg.pool;
      const userId = request.session.id;
      const log = request.log;
      const token = request.body.token;

      await emailVerify.verify(pool, log, userId, token);
      return reply.send({ code: 200, msg: 'Email verified successfully' });
    } catch (ex) {
      request.log.error(ex.trace, ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.code(code).send({ code, msg: ex.message });
    }
  },

  async requestPasswordReset (request, reply) {
    try {
      const pool = request.server.pg.pool;
      const userId = request.session.id;
      const log = request.log;

      await passwdReset.requestReset(pool, log, userId);
      return reply.send({
        code: 200,
        msg: 'Password reset link is sent to your email'
      });
    } catch (ex) {
      request.log.error(ex.trace, ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.code(code).send({ code, msg: ex.message });
    }
  },
  async updatePassword (request, reply) {
    try {
      const pool = request.server.pg.pool;
      const userId = request.session.id;
      const log = request.log;
      const { token, password } = request.body;

      await passwdReset.verify(pool, log, userId, token);
      await userSerivice.updatePassword(pool, log, userId, password);

      return reply.send({ code: 200, msg: 'Password is updated' });
    } catch (ex) {
      request.log.error(ex.trace, ex.message);
      const code = ex.code < 500 ? ex.code : 500;
      return reply.code(code).send({ code, msg: ex.message });
    }
  }
};
