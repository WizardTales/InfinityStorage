// Require the framework and instantiate it
import Fastify from 'fastify';
import { Client as MClient } from 'minio';
import multipart from '@fastify/multipart';
import upload from './lib/controllers/upload.js';
import routes from './lib/routes/index.js';
import Promise from 'bluebird';
import storageService from './lib/services/storage.js';
import cors from '@fastify/cors';
import config from './config.js';
import CRDB from 'crdb-pg';
import DBMigrate from 'db-migrate';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import spPlugin from './lib/plugins/sp.js';
import SQL from 'sql-template-tag';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

config.s3.port = Number(config.s3.port);
if (typeof config.s3.useSSL === 'string') {
  config.s3.useSSL = config.s3.useSSL === 'true';
}
const minioClient = new MClient(config.s3);

const fastify = Fastify({ logger: true });

const dbm = DBMigrate.getInstance(true);

fastify.decorate('s3', Promise.promisifyAll(minioClient, { suffix: 'A' }));
fastify.register(multipart);
fastify.register(cors, config.server.cors);

fastify.register(fastifyCookie);
fastify.register(fastifySession, {
  secret: '2b2fd0faa75e6a9f99d513911e7a5cb5802ca65b635bf587e3e784eb51e051a4', // Secret testing  purposes only!
  cookie: {
    secure: false
  }
});

fastify.addHook('preHandler', spPlugin);

fastify.addHook('onRequest', async (request, reply) => {
  if (request.session.user) {
    request.user = request.session.user;
    const { pool } = request.server.pg;
    const { msg: storage } = await storageService.getStorageById(
      pool,
      request.user.id
    );
    request.storage = storage;
  }
});

// Routes
fastify.register(routes);

// Declare a route
fastify.get('/api/d1', upload.d1);

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
    fastify.log.error(err);
    process.exit(1);
  }
};

dbm.up().then(() => {
  const { settings } = dbm.config.getCurrent();

  const crdb = new CRDB(settings);
  const pool = crdb.pool();
  fastify.decorate('pg', { pool });

  pool
    .retry(async (client) => {
      await client.query(SQL`DELETE FROM "storage"`);
      await client.query(SQL`DELETE FROM "user"`);
    })
    .then(() => console.log('Cleared'));

  start();
});
