import controller from '../controllers/browse.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', controller.getObjects);
  fastify.get('/:id', controller.getObjects);
}

export default routes;
