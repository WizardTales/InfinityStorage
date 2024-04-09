import fileRoutes from './file.js';
import authRoutes from './auth.js';

async function routes (fastify, options) {
  fastify.register(fileRoutes, { prefix: '/file' });
  fastify.register(authRoutes);
}

export default routes;
