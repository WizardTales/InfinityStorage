'use strict';

export default {
  async challenge (request, h) {
    // we only use mail for auth, which we need to require to be lower case
    const username = request.payload.username.toLowerCase();
    const ip = request.info.remoteAddress;

    const result = await request.seneca.actAsync(
      'service:user,command:challenge',
      { data: { username, ip } }
    );

    if (result.code) {
      return h.response(result).code(result.code);
    }

    return result;
  },

  async login (request, h) {
    // we only use mail for auth, which we need to require to be lower case
    const username = request.payload.username.toLowerCase();
    const { password } = request.payload;
    const ip = request.info.remoteAddress;
    const result = await request.seneca.actAsync('service:user,command:auth', {
      data: { username, ip, password }
    });

    if (result.code) {
      if (result.code === 200 && result.auth === true) {
        request.cookieAuth.set({ id: result.user.id });
      }

      return h.response(result).code(result.code);
    }

    return result;
  },

  async register (request, h) {
    // we only use mail for auth, which we need to require to be lower case
    const username = request.payload.username.toLowerCase();
    const { agreements } = request.payload;
    const ip = request.info.remoteAddress;

    if (request.auth.isAuthenticated) {
      return h.response({ error: true, msg: 'Already logged in!' });
    }

    if (!agreements.agb) {
      return h
        .response({ error: true, msg: 'AGB must be accepted!' })
        .code(400);
    }

    const result = await request.seneca.actAsync(
      'service:user,command:register',
      {
        data: { ...request.payload, username, ip }
      }
    );

    if (result.code) {
      if (result.code === 200) {
        request.cookieAuth.set({ id: result.user.id });
      }

      return h.response(result).code(result.code);
    }

    return result;
  },

  async logout (request, h) {
    if (request.auth.isAuthenticated) {
      request.cookieAuth.clear();
    }

    return h.response({ error: false, msg: 'Logged out!' });
  }
};
