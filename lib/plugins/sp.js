import SP from 'secure-passwords';
import config from '../../config.js';

export default function (request, reply, done) {
  const _authDriver = {
    getSalt: async (username) => {
      const { pool } = request.server.pg;
      const { rows } = await pool.query(
        'SELECT "salt" FROM "user" WHERE "username" = $1',
        [username]
      );

      if (rows[0]) return rows[0].salt;
      else return null;
    },
    getAuth: async (username, ip) => {
      const { pool } = request.server.pg;
      const { rows } = await pool.query(
        'SELECT "challenge", "hash", age("date")::INT as age FROM "user" ' +
          'INNER JOIN "challenge" ch ON (ch."user_id" = "user"."id") ' +
          'WHERE "username" = $1',
        [username]
      );
      if (rows[0]) {
        rows[0].challenge = JSON.parse(rows[0].challenge);
        rows[0].age *= 1000;
        return rows[0];
      } else return { challenge: null, hash: null, age: null };
    },
    setChallenge: async (username, challenge, ip, validTill) => {
      const { pool } = request.server.pg;
      let { rows: user } = await pool.query(
        'SELECT "user"."id", age(ch."date")::INT AS "seconds" ' +
          'FROM "user" LEFT JOIN "challenge" ch ' +
          `ON (ch."user_id" = "user"."id" AND "ip" = $2)` +
          'WHERE "username" = $1',
        [username, ip]
      );

      if (!user[0]) return 'failed';
      else user = user[0];

      if (user.seconds) {
        if (user.seconds * 1000 < validTill) {
          return 'failed';
        } else {
          await _authDriver.cleanChallenge(username, ip, validTill);
        }
      }

      await pool.query(
        'INSERT INTO "challenge" ("user_id", "challenge", "ip") ' +
          'VALUES ($1, $2, $3)',
        [user.id, challenge, ip]
      );

      return 'success';
    },

    cleanChallenge: async (username, ip, validTill) => {
      validTill /= 1000;
      const { pool } = request.server.pg;
      await pool.query(
        'DELETE FROM "challenge" ch ' +
          `WHERE age("date") > INTERVAL '${validTill}s' OR ` +
          '(ch."user_id" = (SELECT "id" FROM "user" WHERE "username" = $1) AND "ip" = $2)',
        [username, ip]
      );

      return true;
    }
  };

  const sp = new SP({
    domain: config.sp.domain,
    providesAge: true,
    db: _authDriver
  });

  request.sp = sp;
  done();
}
