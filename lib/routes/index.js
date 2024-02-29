import storageRoutes from './storage.js';

async function routes (fastify, options) {
  fastify.register(storageRoutes, { prefix: '/storage' });
}

export default routes;
