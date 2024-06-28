import fileRoutes from './file.js';
import authRoutes from './auth.js';
import storageRoutes from './storage.js';
import browseRoutes from './browse.js';
import userRoutes from './user.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  await fastify.register(fileRoutes, { prefix: '/file' });
  await fastify.register(storageRoutes, { prefix: '/storage' });
  await fastify.register(browseRoutes, { prefix: '/browse' });
  await fastify.register(userRoutes, { prefix: '/user' });
  await fastify.register(authRoutes);
}

export default routes;
