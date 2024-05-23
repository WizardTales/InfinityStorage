import { describe, it, before, after } from 'mocha';
import SQL from 'sql-template-tag';
import fs from 'fs';
import path from 'path';
import { createFile, deleteFile, lock, unlock } from '../lib/services/file.js';
import assert from 'assert';

/** @type {require('pg').Pool} */
let pool;
/** @type {MClient} */
let minioClient;
let fileId;
let userId;
let storageId;

describe('file locking service', function (done) {
  before(async function () {
    pool = global.pool;
    minioClient = global.mClient;
    fileId = global.fileId;
    userId = global.userId;
    storageId = global.storageId;

    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename: 'dummyfile2.txt',
      mimetype: 'plain/text',
      fields: { fileParent: { value: 'testing' } },
      file
    };

    const { code, data, msg } = await createFile(
      pool,
      minioClient,
      dummyFile,
      userId,
      storageId
    );

    assert.equal(code, 200, msg);

    fileId = data.id;
  });

  after(async function () {
    await deleteFile(pool, minioClient, fileId, userId, storageId);
  });

  it('should lock', async function () {
    const lockRes = await lock(pool, fileId, userId, storageId);

    assert.equal(lockRes.code, 200);
  });

  it('should restrict deleting a locked file', async function () {
    const { code, msg } = await deleteFile(
      pool,
      minioClient,
      fileId,
      userId,
      storageId
    );

    assert.equal(code, 400);
    assert.equal(msg, 'File is locked');
  });

  it('should unlock', async function () {
    const { code: unlockCode } = await unlock(pool, fileId, userId, storageId);

    assert.equal(unlockCode, 200);
  });
});
