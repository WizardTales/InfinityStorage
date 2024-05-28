import { addAccessMode, removeAccessMode } from '../services/access.js';

export default {
  addAccess (access) {
    return async function (request, reply) {
      try {
        const { pool } = request.server.pg;
        const { id: fileId } = request.params;
        const { id: ownerId } = request.session;
        const { userId } = request.body;

        await addAccessMode(pool, fileId, userId, ownerId, access);
      } catch (ex) {
        request.log.error(ex.message);
        return reply.send({ code: 500, msg: ex.message }).code(500);
      }
    };
  },
  remove (access) {
    return async function (request, reply) {
      try {
        const { pool } = request.server.pg;
        const { id: fileId } = request.params;
        const { id: ownerId } = request.session;
        const { userId } = request.body;

        await removeAccessMode(pool, fileId, userId, ownerId, access);
      } catch (ex) {
        request.log.error(ex.message);
        return reply.send({ code: 500, msg: ex.message }).code(500);
      }
    };
  }
};
