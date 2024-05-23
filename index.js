// Require the framework and instantiate it
import Fastify from 'fastify';
import { Client as MClient } from 'minio';
import multipart from '@fastify/multipart';
import loggerOptions from './lib/plugins/loggerOptions.js';
import routes from './lib/routes/index.js';
import Promise from 'bluebird';
import cors from '@fastify/cors';
import config from './config.js';
import CRDB from 'crdb-pg';
import DBMigrate from 'db-migrate';
import fastifyCookie from '@fastify/cookie';
import spPlugin from './lib/plugins/sp.js';
import Iron from '@hapi/iron';

config.s3.port = Number(config.s3.port);
if (typeof config.s3.useSSL === 'string') {
  config.s3.useSSL = config.s3.useSSL === 'true';
}
const minioClient = new MClient(config.s3);

const fastify = Fastify({ logger: loggerOptions[config.env] ?? true });

const dbm = DBMigrate.getInstance(true);

fastify.decorate('s3', Promise.promisifyAll(minioClient, { suffix: 'A' }));
fastify.register(multipart);
fastify.register(cors, config.server.cors);

fastify.register(fastifyCookie, {
  secret: {
    sign: async (value) => {
      return Iron.seal(value, config.cookies.password, Iron.defaults);
    },
    unsign: async (value) => {
      return Iron.unseal(value, config.cookies.password, Iron.defaults);
    }
  },
  parseOptions: config.cookies.config
});

fastify.addHook('preHandler', spPlugin);

// Routes
fastify.register(routes);

// Run the server!
const start = async () => {
  try {
    const bucketName = config?.s3?.bucket;
    const exists = await fastify.s3.bucketExistsA(bucketName);
    if (!exists) {
      fastify.log.error(`Bucket ${bucketName} does not exists!`);
      process.exit(1);
    }

    await fastify.listen(config.server.listen);
  } catch (err) {
    fastify.log.error(err.message);
    process.exit(1);
  }
};

dbm.up().then(() => {
  const { settings } = dbm.config.getCurrent();

  const crdb = new CRDB(settings);
  const pool = crdb.pool();
  fastify.decorate('pg', { pool });

  start();
});
