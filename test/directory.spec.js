import { describe, it, before, after } from 'mocha';
import * as dir from '../lib/services/directory.js';
import DBMigrate from 'db-migrate';
import CRDB from 'crdb-pg';
import assert from 'assert';

/** @type {require('pg').Pool} */
let pool;
let parentId, childId;
const parentName = 'testDir';

describe('Directory service', function (done) {
  before(async function () {
    const dbm = DBMigrate.getInstance(true);
    const { settings } = dbm.config.getCurrent();

    const crdb = new CRDB(settings);
    pool = crdb.pool();

    const { id } = await dir.create(pool, parentName);
    parentId = id;
  });

  after(async function () {
    await dir.removeById(pool, parentId);
  });

  describe('Directory CRUD', function () {
    it('should check if the directory exists', async function () {
      const exists = await dir.exists(pool, parentName);

      assert.ok(exists);
    });

    it('should create a unique dir name', async function () {
      const testdir = await dir.create(pool, 'testdir', parentId);

      assert.equal(testdir.name, 'testdir');
    });

    it('should not allow a non-unique directory name', async function () {
      try {
        await dir.create(pool, parentName);
        assert.fail('Supposed to throw an Error');
      } catch (ex) {
        assert.equal(ex.code, 409);
        assert.equal(ex.message, 'Directory already exists');
      }
    });

    it('should get details of the directory', async function () {
      const directory = await dir.get(pool, parentName);

      assert.equal(directory.name, parentName);
    });

    it('should get details of the directory by id', async function () {
      const directory = await dir.getById(pool, parentId);

      assert.equal(directory.name, parentName);
    });

    it('should create a directory within parent', async function () {
      const directory = await dir.create(pool, 'child', parentId);

      assert.equal(directory.name, 'child');
      assert.equal(directory.parentId, parentId);

      childId = directory.id;
    });

    it('should split a path and create dirs', async function () {
      const directory = await dir.createPath(pool, '/testDir/child/last');

      assert.equal(directory.name, 'last');
    });

    it('should remove a dir', async function () {
      assert.doesNotThrow(async () => await dir.remove(pool, 'last', childId));
    });

    it("should remove a directory by it's id", async function () {
      assert.doesNotThrow(async () => await dir.removeById(pool, childId));
    });
  });

  describe('Directory Other operations', function () {
    after(async function () {
      await dir.remove(pool, 'testroot');
    });

    it('should move folder from one parent to another', async function () {
      const testDir = await dir.createPath(pool, '/testroot/parent1/testDir');
      const parent2 = await dir.createPath(pool, '/testroot/parent2');

      const testDir2 = await dir.move(pool, testDir.id, parent2.id);

      assert.equal(testDir2.parentId, parent2.id);
    });

    it('should get dir by path', async function () {
      const dir1 = await dir.createPath(pool, '/testroot/parent3/testDir');
      const dir2 = await dir.getDirByPath(pool, '/testroot/parent3/testDir');
      assert.equal(dir1.id, dir2.id);
    });

    it('should check if a path exists', async function () {
      assert.ok(await dir.existsPath(pool, '/testroot/parent2/testDir'));
    });

    it('should check if a path does not exists', async function () {
      assert.ok(!(await dir.existsPath(pool, '/testroot/parent1/testDir')));
    });
  });
});
