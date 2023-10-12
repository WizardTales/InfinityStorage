'use strict';

exports.migrate = (db, opt) => {
  const type = opt.dbm.dataType;
  return db.createTable('user', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      autoIncrement: true,
      family: 'static'
    },
    username: {
      type: type.STRING,
      length: 250,
      notNull: true,
      unique: true,
      family: 'static'
    },
    hash: {
      type: type.STRING,
      length: 128,
      notNull: true,
      family: 'dynamic'
    },
    salt: {
      type: type.STRING,
      length: 32,
      notNull: true,
      family: 'dynamic'
    },
    type: {
      type: type.INTEGER
    },
    data: {
      type: 'JSONB'
    },
    createdAt: {
      type: 'TIMESTAMPTZ',
      defaultValue: {
        raw: 'CURRENT_TIMESTAMP()'
      },
      notNull: true
    },
    updatedAt: {
      type: 'TIMESTAMPTZ',
      defaultValue: {
        special: 'CURRENT_TIMESTAMP'
      },
      onUpdate: {
        special: 'NOW'
      },
      notNull: true
    }
  });
};

exports._meta = {
  version: 2
};
