import controller from '../controllers/storage.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
  fastify.post('/', controller.createStorage);

  fastify.get('/get-user-storages/:userId', controller.getStoragesByUserId);
}

export default routes;
