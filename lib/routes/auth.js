import controller from '../controllers/auth.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.post('/register', controller.register);
  fastify.post('/challenge', controller.challenge);
  fastify.post('/login', controller.login);
  fastify.get('/logout', controller.logout);
}

export default routes;
