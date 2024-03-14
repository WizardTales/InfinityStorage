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
  fastify.delete('/:id', controller.deleteFile);
}

export default routes;
