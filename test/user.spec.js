import { describe, it } from 'mocha';
import * as userService from '../lib/services/user.js';
import assert from 'assert';

describe('User service', function () {
  it('should get global root path for a user', async function () {
    const directory = await userService.getRootDir(global.pool, global.userId);

    assert.ok(directory);
    assert.equal(directory.path, `/global/${global.username}`);
  });
});
