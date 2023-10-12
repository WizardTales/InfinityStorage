'use strict';

export default {
  request: async (request, { username, ip }) => {
    const { authenticator } = request.server.plugins.sp;

    return authenticator.challenge(username, ip);
  },

  pin: 'service:user,command:challenge'
};
