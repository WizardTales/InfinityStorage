import { describe, it, before, after } from 'mocha';
import { createFile, deleteFile, updateFile } from '../lib/services/file.js';
import versionService from '../lib/services/version.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

/** @type {require('pg').Pool} */
let pool;
/** @type {MClient} */
let minioClient;
let fileId, dummyFile2;
let userId;
let storageId;

describe('Version', function () {
  before(async function () {
    minioClient = global.mClient;
    pool = global.pool;
    userId = global.userId;
    storageId = global.storageId;

    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename: 'dummyfile.txt',
      mimetype: 'plain/text',
      fields: { fileParent: { value: 'testing' } },
      file
    };

    const filePath2 = path.join(process.cwd(), 'test/dummyfile.txt');
    const file2 = fs.createReadStream(filePath2, { encoding: 'utf-8' });

    dummyFile2 = {
      filename: 'dummyfile.txt',
      mimetype: 'plain/text',
      fields: { fileParent: { value: 'testing' } },
      file: file2
    };

    const {
      code,
      data: { id }
    } = await createFile(
      global.log,
      pool,
      minioClient,
      dummyFile,
      userId,
      storageId
    );

    assert.equal(code, 200);

    fileId = id;
  });

  after(async function () {
    await deleteFile(pool, minioClient, fileId, userId, storageId);
  });

  it('should get latest version', async function () {
    const latestVersion = await versionService.getLatestVersion(
      pool,
      fileId,
      storageId
    );

    assert.equal(latestVersion?.version, 0);
  });

  it('should update a file', async function () {
    const updatedFile = await updateFile(
      global.log,
      pool,
      minioClient,
      fileId,
      dummyFile2,
      userId,
      storageId
    );

    assert.equal(updatedFile.code, 200);
    assert.equal(updatedFile.data.version, 1);
  });

  it('should get specific version of file', async function () {
    const version0 = await versionService.getSpecificVersion(
      pool,
      fileId,
      0,
      storageId
    );
    const version1 = await versionService.getSpecificVersion(
      pool,
      fileId,
      1,
      storageId
    );

    assert.equal(version0.version, 0);
    assert.equal(version1.version, 1);
  });

  it('should get list of every versions of a file', async function () {
    const list = await versionService.listVersions(pool, fileId, storageId);

    assert.equal(list.length, 2);
  });
});
