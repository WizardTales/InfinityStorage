'use strict';

exports.migrate = async (db, opt) => {
  await db.createTable('lock', {
    expire: 'expireAt',
    columns: {
      id: {
        type: 'UUID',
        primaryKey: true,
        autoIncrement: true
      },
      fileId: {
        type: 'UUID',
        notNull: true
      },
      expireAt: {
        type: 'timestamptz',
        notNull: true,
        defaultValue: {
          raw: `'5 seconds'::INTERVAL + CURRENT_TIMESTAMP`
        }
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
        },
        onUpdate: {
          special: 'NOW'
        }
      }
    }
  });
};

exports._meta = {
  version: 2
};
