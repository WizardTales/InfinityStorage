import { before, describe, it } from 'mocha';
import * as resetPassword from '../lib/services/resetPassword.js';
import assert from 'assert';

let userId, log, pool, token;

describe('Password reset service', function () {
  before(function () {
    userId = global.userId;
    log = global.log;
    pool = global.pool;
  });

  it('should send a password reset link', async function () {
    const info = await resetPassword.requestReset(pool, log, userId);

    token = info?.token;
    assert.ok(info);
  });

  it('should verify password reset token', function () {
    assert.doesNotThrow(async () => {
      assert.ok(await resetPassword.verify(pool, log, userId, token));
    });
  });
});
