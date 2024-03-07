import controller from '../controllers/file.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.post('/', controller.createFile);
}

export default routes;
