'use strict';
import nodemailer from 'nodemailer';
import config from '../../config.js';

const email = config.email;
const mailOption = {
  host: email.host,
  port: email.port,
  secure: email.secure,
  tls: email.tls
};

if (email.user) {
  mailOption.auth = {};
  mailOption.auth.user = email.user;
  mailOption.auth.pass = email.pass;
} else {
  mailOption.authMethod = 'PLAIN';
}

const transporter = nodemailer.createTransport(mailOption);

/**
 * Send mail
 *
 * @param {import('fastify').FastifyBaseLogger} log Logger object
 * @param {Object} payload Email payload
 */
async function main (log, payload) {
  payload.from = `"${email.author}" <${email.from}>`;

  try {
    const info = await transporter.sendMail(payload);

    log.info(info, 'Message sent');
  } catch (ex) {
    log.error(payload, `Error: ${ex.message}`);
  }
}
export default main;
