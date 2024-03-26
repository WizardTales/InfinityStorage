import * as service from '../services/file.js';
import * as validationCheck from '../validations/file.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createFile (request, reply) {
    const { pool } = request.server.pg;

    const minioCient = request.server.s3;

    const data = await request.file();

    if (data === undefined) {
      return reply.send({ message: 'No file found!!' }).code(400);
    }

    if (
      !(await validationCheck.isValidFilePath(data.fields.filePath.value, data))
    ) {
      return reply.send({ message: 'Invalid file path' }).code(400);
    }

    reply.send(await service.createFile(pool, minioCient, data));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFiles (request, reply) {
    const { pool } = request.server.pg;
    const { storageId, page, length } = request.query;

    reply.send(await service.getFiles(pool, storageId, page, length));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFileById (request, reply) {
    const { pool } = request.server.pg;
    const { id } = request.params;

    reply.send(await service.getFileById(pool, id));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async downloadFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { id } = request.params;

    const { code, meta, readable, msg } = await service.downloadFile(
      pool,
      minioCient,
      id
    );

    if (code === 200) {
      reply.headers({
        'Content-Type': meta.mime.type,
        'Content-Disposition': `attachment; filename=${meta.filename}`,
        'Content-Length': `${meta.size}`
      });
      reply.send(readable);
    } else {
      reply.send({ code, msg }).code(code || 500);
    }

    return reply;
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async deleteFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { id } = request.params;

    const { code } = await service.deleteFile(pool, minioCient, id);

    return reply.send({ code });
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async moveFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { fileId } = request.body;
    const { updatedPath } = request.body;

    const getFileData = await service.getFileById(pool, fileId);

    // validation path check
    if (
      !(await validationCheck.isValidFilePath(updatedPath, getFileData.data))
    ) {
      return reply.send({ msg: 'File path is not valid!!' }).code(400);
    }

    if (getFileData.code === 500 || getFileData.data === undefined) {
      return reply.send({ msg: 'No data found!!' }).code(400);
    }

    if (
      updatedPath.split('/').pop() !==
      getFileData.data.filename.split('/').pop()
    ) {
      return reply.send({ msg: 'Filename not same!!' }).code(400);
    }
    const payload = { fileId, updatedPath };

    const { code } = await service.moveFile(pool, minioCient, payload);

    return reply.send({ code });
  }
};
