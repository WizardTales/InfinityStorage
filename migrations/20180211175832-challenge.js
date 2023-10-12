'use strict';

exports.migrate = (db, opt) => {
  const type = opt.dbm.dataType;
  return db.createTable('challenge', {
    expire: 'expire_at',
    columns: {
      id: {
        type: 'uuid',
        primaryKey: true,
        autoIncrement: true,
        notNull: true
      },
      user_id: {
        type: 'uuid',
        primaryKey: true,
        notNull: true
      },
      challenge: {
        type: type.STRING,
        notNull: true
      },
      ip: {
        type: type.STRING,
        notNull: true
      },
      expire_at: 'timestamptz',
      date: {
        type: 'timestamptz',
        notNull: true,
        defaultValue: {
          special: 'CURRENT_TIMESTAMP'
        }
      }
    }
  });
};

exports._meta = {
  version: 2
};
