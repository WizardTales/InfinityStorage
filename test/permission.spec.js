import { describe, it, before, after } from 'mocha';
import { createFile, deleteFile } from '../lib/services/file.js';
import {
  hasAccess,
  grantAccess,
  revokeAccess
} from '../lib/services/permission.js';
import { Client as MClient } from 'minio';
import uuid from 'uuid-random';
import config from '../config.js';
import DBMigrate from 'db-migrate';
import CRDB from 'crdb-pg';
import SQL from 'sql-template-tag';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

/** @type {require('pg').Pool} */
let pool;
/** @type {MClient} */
let minioClient;
let fileId;
const userId = uuid();
const storageId = uuid();

describe('Permission service', function () {
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
      code,
      data: { id }
    } = await createFile(pool, minioClient, dummyFile, userId, storageId);

    assert.equal(code, 200);

    fileId = id;
  });

  after(async function () {
    await deleteFile(pool, minioClient, fileId, userId, storageId);
  });

  it('should grant access to user', async function () {
    const { code, permission } = await grantAccess(
      pool,
      userId,
      fileId,
      storageId
    );

    assert.equal(code, 200);
    assert.equal(permission.permissions, 1);
  });

  it('checks valid access', async function () {
    const permission = await hasAccess(pool, userId, fileId, storageId);

    assert.ok(permission);
  });

  it('should revoke access to user', async function () {
    const { code, permission } = await revokeAccess(
      pool,
      userId,
      fileId,
      storageId
    );

    assert.equal(code, 200);
    assert.equal(permission.permissions, 0);
  });

  it('checks invalid access', async function () {
    const permission = await hasAccess(pool, userId, fileId, storageId);

    assert.ok(!permission);
  });
});
