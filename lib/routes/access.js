import controller from '../controllers/access.js';
import {
  P_READFILE,
  P_WRITEFILE,
  P_DELETEFILE,
  P_GRANTFILE
} from '../services/access.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {*} options
 */
async function routes (fastify, options) {
  /** Add access */
  fastify.put('/read', controller.addAccess(P_READFILE));
  fastify.put('/write', controller.addAccess(P_WRITEFILE));
  fastify.put('/delete', controller.addAccess(P_DELETEFILE));
  fastify.put('/grant', controller.addAccess(P_GRANTFILE));

  /** Remove access */
  fastify.delete('/read', controller.removeAccess(P_READFILE));
  fastify.delete('/write', controller.removeAccess(P_WRITEFILE));
  fastify.delete('/delete', controller.removeAccess(P_DELETEFILE));
  fastify.delete('/grant', controller.removeAccess(P_GRANTFILE));
}

export default routes;
