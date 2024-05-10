import * as service from '../services/file.js';
import * as validationCheck from '../validations/file.js';

export default {
  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async createFile (request, reply) {
    const { pool } = request.server.pg;
    const userId = request.session?.id;

    const minioCient = request.server.s3;

    const data = await request.file();

    if (data === undefined) {
      return reply.send({ message: 'No file found!!' }).code(400);
    }

    if (
      !(await validationCheck.isValidFile(data.fields.fileParent.value, data))
    ) {
      return reply.send({ message: 'Invalid file path' }).code(400);
    }

    const storageId = data.fields.storageId.value;
    const encryptionKey = data.fields.encryptionKey?.value || null;

    reply.send(
      await service.createFile(
        pool,
        minioCient,
        data,
        userId,
        storageId,
        encryptionKey
      )
    );
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async updateFile (request, reply) {
    const { pool } = request.server.pg;
    const { id } = request.params;
    const userId = request.session?.id;

    const minioCient = request.server.s3;

    const data = await request.file();

    if (data === undefined) {
      return reply
        .send({ code: 400, msg: 'No file found! Please check input' })
        .code(400);
    }

    const storageId = data.fields.storageId.value;
    const encryptionKey = data.fields.encryptionKey?.value || null;

    reply.send(
      await service.updateFile(
        pool,
        minioCient,
        id,
        data,
        userId,
        storageId,
        encryptionKey
      )
    );
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFiles (request, reply) {
    const { pool } = request.server.pg;
    const { page, length, storageId } = request.query;
    const userId = request.session?.id;

    reply.send(await service.getFiles(pool, userId, storageId, page, length));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async getFileById (request, reply) {
    const { pool } = request.server.pg;
    const { id } = request.params;
    const { storageId, version = null } = request.query;
    const userId = request.session?.id;

    reply.send(await service.getFileById(pool, id, version, userId, storageId));
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async downloadFile (request, reply) {
    const { pool } = request.server.pg;
    const minioCient = request.server.s3;
    const { id } = request.params;
    const { storageId, version = null } = request.query;
    const userId = request.session?.id;

    const { code, meta, readable, msg } = await service.downloadFile(
      pool,
      minioCient,
      id,
      version,
      userId,
      storageId
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
    const storageId = request.query.storageId;
    const userId = request.session?.id;

    const res = await service.deleteFile(
      pool,
      minioCient,
      id,
      userId,
      storageId
    );

    return reply.send(res).code(res.code);
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async moveFile (request, reply) {
    const { pool } = request.server.pg;
    const { id } = request.params;
    const { updatedPath, storageId } = request.body;
    const userId = request.session?.id;

    const getFileData = await service.getFileById(pool, id, userId, storageId);

    // validation path check
    if (!(await validationCheck.isValidFile(updatedPath))) {
      return reply.send({ msg: 'File path is not valid!!' }).code(400);
    }

    if (updatedPath === getFileData.data.path) {
      return reply.send({ msg: 'New path is same as current!!' }).code(400);
    }

    if (getFileData.code === 500 || getFileData.data === undefined) {
      return reply.send({ msg: 'No data found!!' }).code(400);
    }

    const payload = { id, updatedPath, storageId, userId };

    const { code } = await service.moveFile(pool, payload);

    return reply.send({ code }).code(code);
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async copyFile (request, reply) {
    try {
      const { pool } = request.server.pg;
      const { id } = request.params;
      const { path, storageId } = request.body;
      const userId = request.session?.id;

      const payload = { id, path, storageId, userId };

      const newFile = await service.copyFile(pool, payload);

      return reply.send({ code: 200, data: newFile });
    } catch (ex) {
      const code = ex.code < 500 ? ex.code : 500;
      return reply.code(code).send({ code, msg: ex.message });
    }
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async lock (request, reply) {
    try {
      const { pool } = request.server.pg;
      const { id } = request.params;
      const { storageId } = request.body;
      const userId = request.session?.id;

      const { code, msg } = await service.lock(pool, id, userId, storageId);

      return reply.send({ code, msg });
    } catch (ex) {
      return reply.code(500).send({ code: 500, msg: ex.message });
    }
  },

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {import('fastify').FastifyReply} reply
   */
  async unlock (request, reply) {
    try {
      const { pool } = request.server.pg;
      const { id } = request.params;
      const { storageId } = request.body;
      const userId = request.session?.id;

      const { code, msg } = await service.unlock(pool, id, userId, storageId);

      return reply.send({ code, msg });
    } catch (ex) {
      return reply.code(500).send({ code: 500, msg: ex.message });
    }
  }
};
