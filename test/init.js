import { before, after } from 'mocha';
import SQL from 'sql-template-tag';
import config from '../config.js';
import { Client as MClient } from 'minio';
import DBMigrate from 'db-migrate';
import CRDB from 'crdb-pg';
import assert from 'assert';
import uuid from 'uuid-random';
import Promise from 'bluebird';

/** @type {require('pg').Pool} */
global.pool = null;
global.userId = null;
global.username = 'testuser';
global.storageId = uuid();

/** @type {MClient} */
global.mClient = null;

before(async function () {
  config.s3.port = Number(config.s3.port);
  if (typeof config.s3.useSSL === 'string') {
    config.s3.useSSL = config.s3.useSSL === 'true';
  }

  global.mClient = new MClient(config.s3);
  global.mClient = Promise.promisifyAll(global.mClient, { suffix: 'A' });

  const dbm = DBMigrate.getInstance(true);
  const { settings } = dbm.config.getCurrent();

  const crdb = new CRDB(settings);
  global.pool = crdb.pool();

  const q = SQL`INSERT INTO "user" ("username", "hash", "salt")
    VALUES (${global.username}, 'dtawt3w', 'asdasdas')
    RETURNING id`;

  const {
    rows: [{ id }]
  } = await global.pool.query(q);

  global.userId = id;
  assert.ok(!!id);

  await global.pool.query(SQL`INSERT INTO "storage" ("id", "ownerId", "data")
  VALUES (${global.storageId}, ${global.userId}, '{}')`);

  console.log('===== INITIALIZED =====');
});

after(async function () {
  const q = SQL`DELETE FROM "user" WHERE "id" = ${global.userId}`;

  await global.pool.query(q);
  console.log('Testing complete');
});
