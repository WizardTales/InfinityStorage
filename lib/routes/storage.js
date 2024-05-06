import controller from '../controllers/storage.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.post('/', controller.createStorage);
  fastify.get('/', controller.getStoragesByUserId);
}

export default routes;
