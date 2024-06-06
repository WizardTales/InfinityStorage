import { describe, it, before, after } from 'mocha';
import { createFile, deleteFile } from '../lib/services/file.js';
import * as accessService from '../lib/services/access.js';
import SQL from 'sql-template-tag';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import uuid from 'uuid-random';

let fileId;
const user2Id = uuid();
const username2 = 'otheruser';
let minioClient;

describe('Access service', function () {
  before(async function () {
    minioClient = global.mClient;
    await global.pool.query(
      SQL`INSERT INTO "user" (id, username, hash, salt)
      VALUES (${user2Id}, ${username2}, 'aasdas', 'asdas')
      ON CONFLICT (username) DO NOTHING`
    );

    const filePath = path.join(process.cwd(), 'test/dummyfile.txt');
    const file = fs.createReadStream(filePath, { encoding: 'utf-8' });

    const dummyFile = {
      filename: 'dummyfile.txt',
      mimetype: 'plain/text',
      fields: { fileParent: { value: 'testing' } },
      file
    };

    const newFile = await createFile(
      global.pool,
      global.mClient,
      dummyFile,
      global.userId,
      global.storageId
    );

    assert.ok(newFile);

    fileId = newFile.id;
  });

  after(async function () {
    await deleteFile(
      global.pool,
      minioClient,
      fileId,
      global.userId,
      global.storageId
    );

    await global.pool.query(SQL`DELETE FROM "user" WHERE id = ${user2Id}`);
  });

  describe('File owner access', function () {
    it('should return true for all access mode', async function () {
      const permission = await accessService.getAccessMode(
        global.pool,
        fileId,
        global.userId
      );

      assert.ok(
        permission & accessService.P_GRANTFILE,
        'Does not have grant access'
      );
      assert.ok(
        permission & accessService.P_DELETEFILE,
        'Does not have delete access'
      );
      assert.ok(
        permission & accessService.P_WRITEFILE,
        'Does not have write access'
      );
      assert.ok(
        permission & accessService.P_READFILE,
        'Does not have read access'
      );
    });
  });

  describe('Main access service', function () {
    it('should be able to grant access to other user', function (done) {
      assert.doesNotThrow(async () => {
        await accessService.addAccessMode(
          global.pool,
          fileId,
          user2Id,
          global.userId,
          accessService.P_READFILE
        );
        done();
      });
    });
    it('should check access for other user', async function () {
      const access = await accessService.getAccessMode(
        global.pool,
        fileId,
        user2Id
      );

      assert.ok(access & accessService.P_READFILE, 'Does not have read access');
      assert.ok(!(access & accessService.P_WRITEFILE), 'Have write access');
    });
    it('should be able to grant multiple access modes to other user', function (done) {
      assert.doesNotThrow(async () => {
        await accessService.addAccessMode(
          global.pool,
          fileId,
          user2Id,
          global.userId,
          accessService.P_WRITEFILE | accessService.P_DELETEFILE
        );
        done();
      });
    });
    it('should remove access to user', function (done) {
      assert.doesNotThrow(async () => {
        await accessService.removeAccessMode(
          global.pool,
          fileId,
          user2Id,
          global.userId,
          accessService.P_DELETEFILE | accessService.P_READFILE
        );
        done();
      });
    });
    it('should check access for user', async function () {
      const access = await accessService.getAccessMode(
        global.pool,
        fileId,
        user2Id
      );

      assert.ok(!(access & accessService.P_DELETEFILE), 'Has delete access');
      assert.ok(access & accessService.P_WRITEFILE, 'Has no write access');
      assert.ok(!(access & accessService.P_READFILE), 'Has read access');
      assert.ok(!(access & accessService.P_GRANTFILE), 'Has grant access');
    });
  });
});
