import SQL from 'sql-template-tag';
import sendEmail from './email.js';
import * as userService from './user.js';
import pug from 'pug';
import config from '../../config.js';
import crypto from 'crypto';

/** @param {import('fastify').FastifyBaseLogger} log */
export async function verify (pool, log, userId, token) {
  const q = SQL`SELECT verified, token FROM "emailVerify"
  WHERE "userId" = ${userId}`;

  log.debug(q.inspect(), 'Select query');

  const {
    rows: [user]
  } = await pool.query(q);

  if (!user) {
    const ex = new Error('Email Verification link not sent');
    ex.code = 404;
    throw ex;
  }

  if (user.verified) {
    const ex = new Error('Email already verified');
    ex.code = 409;
    throw ex;
  }

  log.info(user);
  log.info(token);
  if (user.token !== token) {
    const ex = new Error('Invalid/Tampered token');
    ex.code = 403;
    throw ex;
  }

  const updateQ = SQL`UPDATE "emailVerify"
  SET verified = true
  WHERE "userId" = ${userId}`;

  log.debug(updateQ.inspect(), 'Update query');

  await pool.query(updateQ);
}

export async function sendLink (pool, log, userId) {
  const user = await userService.getById(pool, userId);

  const token = generateToken();

  const q = SQL`UPSERT INTO "emailVerify" ("userId", "token")
  VALUES (${userId}, ${token})
  RETURNING *`;

  const {
    rows: [v]
  } = await pool.query(q);
  log.debug(v, 'UPSERT quert');

  const verifyLink = new URL(config.frontend.baseUrl);
  verifyLink.pathname = '/email-verify';
  verifyLink.searchParams.append('token', token);

  const pugCompiler = pug.compileFile('lib/template/email/verifyEmail.pug');
  const body = pugCompiler({ verifyLink: verifyLink.href });

  // const body = `<header><h4>Please click the below link to verify your email</h4></header>
  // <div class=3D"container"> <a href=3D"${verifyLink.href}">VERIFY </a></div>
  // <footer><p><i>This is an automated email, Please do not reply to this email.</i></p></footer>`;

  const payload = {
    to: user.username,
    subject: `Email verification | Infinity Storage`,
    html: body
  };

  const info = await sendEmail(log, payload);

  return { ...info, token };
}

function generateToken () {
  return crypto.randomBytes(10).toString('hex');
}
