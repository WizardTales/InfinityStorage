import controller from '../controllers/user.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.post(
    '/request-email-verification',
    controller.requestEmailVerification
  );
  fastify.put('/verify-email', controller.verifyEmail);

  fastify.post('/request-password-reset', controller.requestPasswordReset);
  fastify.put('/update-password', controller.updatePassword);
}

export default routes;
