import controller from '../controllers/file.js';
import accessRoutes from './access.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', controller.getFiles);
  fastify.get('/:id', controller.getFileById);
  fastify.get('/:id/download', controller.downloadFile);
  fastify.post('/', controller.createFile);
  fastify.put('/:id', controller.updateFile);
  fastify.post('/:id/move', controller.moveFile);
  fastify.post('/:id/copy', controller.copyFile);
  fastify.delete('/:id', controller.deleteFile);
  fastify.put('/:id/lock', controller.lock);
  fastify.put('/:id/unlock', controller.unlock);

  // Access Routes
  await fastify.register(accessRoutes, { prefix: '/:id/access' });
}

export default routes;
