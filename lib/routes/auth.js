import controller from '../controllers/auth.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
  fastify.post('/login', controller.login_request);
  fastify.get('/logout', controller.logout_request);
}

export default routes;
