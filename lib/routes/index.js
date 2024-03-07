import storageRoutes from './storage.js';
import fileRoutes from './file.js';

async function routes (fastify, options) {
  fastify.register(storageRoutes, { prefix: '/storage' });
  fastify.register(fileRoutes, { prefix: '/file' });
}

export default routes;
