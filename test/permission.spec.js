import { describe, it, before, after } from 'mocha';
import { createFile, deleteFile } from '../lib/services/file.js';
import {
  hasAccess,
  grantAccess,
  revokeAccess
} from '../lib/services/permission.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

/** @type {require('pg').Pool} */
let pool;
/** @type {MClient} */
let minioClient;
let fileId;
let userId;
let storageId;

describe('Permission service', function () {
  before(async function () {
    userId = global.userId;
    storageId = global.storageId;
    pool = global.pool;
    minioClient = global.mClient;
    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename: 'dummyfile1.txt',
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
