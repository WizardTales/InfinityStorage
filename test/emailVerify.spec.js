import { before, describe, it } from 'mocha';
import * as verifyEmail from '../lib/services/emailVerification.js';
import assert from 'assert';

let userId, log, pool, token;

describe('Verify email service', function () {
  before(function () {
    userId = global.userId;
    log = global.log;
    pool = global.pool;
  });

  it('should send a very email link', async function () {
    const info = await verifyEmail.sendLink(pool, log, userId);

    token = info?.token;
    assert.ok(info);
  });

  it('should verify email the token', function () {
    assert.doesNotThrow(async () => {
      await verifyEmail.verify(pool, log, userId, token);
    });
  });
});
