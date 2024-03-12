import controller from '../controllers/storage.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
  });
  fastify.post('/create', controller.createStorage);

  fastify.get('/get-user-storages/:userId', controller.getStoragesByUserId);

  fastify.get('/get-all-storage', controller.getAllStorageData);
}

export default routes;
