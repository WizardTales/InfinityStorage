'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return db.createTable('storage', {
    id: {
      type: 'uuid',
      primaryKey: true,
      autoIncrement: true,
      notNull: true
    },
    ownerId: {
      type: 'uuid',
      notNull: true
    },
    data: {
      type: 'JSONB',
      notNull: true,
      defaultValue: '{}'
    },
    createdAt: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: {
        special: 'CURRENT_TIMESTAMP'
      }
    },
    updatedAt: {
      type: 'timestamptz',
      notNull: true,
      defaultValue: {
        special: 'CURRENT_TIMESTAMP'
      }
    }

  });
};

exports._meta = {
  version: 2
};
