import { describe, it, before, after } from 'mocha';
import {
  createFile,
  deleteFile,
  existsNameInPath
} from '../lib/services/file.js';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

let fileId;
let minioClient;
let pool;
let storageId;
let userId;
const filename = 'dummyfile9.txt';

describe('File service', function () {
  before(async function () {
    minioClient = global.mClient;
    pool = global.pool;
    storageId = global.storageId;
    userId = global.userId;

    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename,
      mimetype: 'plain/text',
      fields: { fileParent: { value: '/testing1' } },
      file
    };

    const newFile = await createFile(
      pool,
      minioClient,
      dummyFile,
      userId,
      storageId
    );

    assert.ok(newFile);

    fileId = newFile.id;
  });

  it('should check for existing file', async function () {
    const exists1 = await existsNameInPath(
      pool,
      filename,
      '/testing1',
      storageId,
      userId
    );
    const exists0 = await existsNameInPath(
      pool,
      filename,
      '/testing0',
      storageId,
      userId
    );

    assert.ok(exists1);
    assert.ok(!exists0);
  });

  after(async function () {
    await deleteFile(
      global.pool,
      minioClient,
      fileId,
      global.userId,
      global.storageId
    );
  });
});
