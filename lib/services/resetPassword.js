import * as userService from './user.js';
import SQL from 'sql-template-tag';
import crypto from 'crypto';
import config from '../../config.js';
import pug from 'pug';
import sendEmail from './email.js';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat.js';

dayjs.extend(LocalizedFormat);

const expAfterH = config?.sp?.passResetExpAfter || 1;

/** @param {import('fastify').FastifyBaseLogger} log */
export async function verify (pool, log, userId, token) {
  const q = SQL`SELECT token, "createdAt" FROM "passwordReset"
  WHERE "userId" = ${userId}`;

  log.debug(q.inspect(), 'Select query');

  const {
    rows: [reset]
  } = await pool.query(q);

  if (!reset) {
    const ex = new Error('Password reset link not sent');
    ex.code = 404;
    throw ex;
  }

  if (dayjs(reset.createdAt).add(expAfterH, 'hours').isBefore(dayjs())) {
    const ex = new Error('Password reset link has expired');
    ex.code = 403;
    throw ex;
  }

  if (reset.token !== token) {
    const ex = new Error('Invalid/Tampered token');
    ex.code = 403;
    throw ex;
  }

  return true;
}

export async function requestReset (pool, log, userId) {
  const user = await userService.getById(pool, userId);

  const token = generateToken();

  const q = SQL`INSERT INTO "passwordReset"
  ("userId", "token") VALUES (${userId}, ${token})
  RETURNING *`;

  const {
    rows: [v]
  } = await pool.query(q);
  log.debug(v, 'UPSERT query');

  const resetLink = new URL(config.frontend.baseUrl);
  resetLink.pathname = '/password-reset';
  resetLink.searchParams.append('token', token);

  const pugCompiler = pug.compileFile('lib/template/email/resetPassword.pug');
  const body = pugCompiler({
    resetLink: resetLink.href,
    expireAt: expAfterH
  });

  const payload = {
    to: user.username,
    subject: `Password Reset | Infinity Storage`,
    html: body
  };

  const info = await sendEmail(log, payload);
  return { ...info, token };
}

function generateToken () {
  return crypto.randomBytes(10).toString('hex');
}
