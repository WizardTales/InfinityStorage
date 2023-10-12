// Require the framework and instantiate it
import Fastify from 'fastify';
import upload from './lib/controllers/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from '@fastify/cors';
import config from './config.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({ logger: true });



fastify.register(cors, config.server.cors);

// Declare a route
fastify.post('/api/d1', upload.d1);


// Run the server!
const start = async () => {
  try {
    await fastify.listen(config.server.listen);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
