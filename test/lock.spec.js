import { describe, it, before, after } from 'mocha';
import DBMigrate from 'db-migrate';
import CRDB from 'crdb-pg';
import SQL from 'sql-template-tag';
import { Client as MClient } from 'minio';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import uuid from 'uuid-random';
import { createFile, deleteFile, lock, unlock } from '../lib/services/file.js';
import { assert } from 'console';
import Promise from 'bluebird';

/** @type {require('pg').Pool} */
let pool;
/** @type {MClient} */
let minioClient;
let fileId;
const userId = uuid();
const storageId = uuid();

describe('file locking service', function (done) {
  before(async function () {
    config.s3.port = Number(config.s3.port);
    if (typeof config.s3.useSSL === 'string') {
      config.s3.useSSL = config.s3.useSSL === 'true';
    }

    minioClient = new MClient(config.s3);
    minioClient = Promise.promisifyAll(minioClient, { suffix: 'A' });

    const dbm = DBMigrate.getInstance(true);
    const { settings } = dbm.config.getCurrent();

    const crdb = new CRDB(settings);
    pool = crdb.pool();

    await pool.query(SQL`INSERT INTO "storage" ("id", "ownerId", "data")
    VALUES (${storageId}, ${userId}, '{}')`);

    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename: 'dummyfile.txt',
      mimetype: 'plain/text',
      fields: { fileParent: { value: 'testing' } },
      file
    };

    const {
      data: { id }
    } = await createFile(pool, minioClient, dummyFile, userId, storageId);
    fileId = id;
  });

  after(async function () {
    await deleteFile(pool, minioClient, fileId, userId, storageId);
  });

  it('should lock', async function () {
    const lockRes = await lock(pool, fileId, userId, storageId);

    assert(lockRes.code, 200);
  });

  it('should restrict deleting a locked file', async function () {
    const { code, msg } = await deleteFile(
      pool,
      minioClient,
      fileId,
      userId,
      storageId
    );

    assert(code, 400);
    assert(msg, 'File is locked');
  });

  it('should unlock', async function () {
    const { code: unlockCode } = await unlock(pool, fileId, userId, storageId);

    assert(unlockCode, 200);
  });
});
