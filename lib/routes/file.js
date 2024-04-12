import controller from '../controllers/file.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  fastify.get('/', controller.getFiles);
  fastify.get('/:id', controller.getFileById);
  fastify.get('/:id/download', controller.downloadFile);
  fastify.post('/', controller.createFile);
  fastify.post('/:id/move', controller.moveFile);
  fastify.post('/:id/copy', controller.copyFile);
  fastify.delete('/:id', controller.deleteFile);
  fastify.put('/:id/lock', controller.lock);
  fastify.put('/:id/unlock', controller.unlock);
}

export default routes;
