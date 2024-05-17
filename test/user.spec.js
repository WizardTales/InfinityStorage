import { describe, it } from 'mocha';
import * as userService from '../lib/services/user.js';
import assert from 'assert';

describe('User service', function () {
  it('should get global root path for a user', async function () {
    const path = await userService.getGlobalRootDir(global.pool, global.userId);

    assert.ok(path);
    assert.equal(path, `/global/${global.username}`);
  });
});
