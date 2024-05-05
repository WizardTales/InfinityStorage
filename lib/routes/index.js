import fileRoutes from './file.js';
import authRoutes from './auth.js';
import storageRoutes from './storage.js';

async function routes (fastify, options) {
  fastify.register(fileRoutes, { prefix: '/file' });
  fastify.register(storageRoutes, { prefix: '/storage' });
  fastify.register(authRoutes);
}

export default routes;
