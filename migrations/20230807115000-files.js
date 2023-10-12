'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  await db.createTable('file', {
    id: {
      type: 'uuid',
      primaryKey: true,
      autoIncrement: true,
      notNull: true
    },
    storageId: {
      type: 'uuid',
      notNull: true,
      foreignKey: {
        name: 'storage_file_fk',
        table: 'storage',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    filename: {
      type: type.STRING,
      notNull: true
    },
    size: {
      type: type.BIGINT,
      notNull: true,
      defaultValue: 0
    },
    mime: {
      type: 'JSONB',
      notNull: true
    },
    encryptionKey: {
      type: type.STRING
    },
    state: {
      type: type.SMALLINT,
      defaultValue: 1
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
  return db.addIndex('file', 'findFile', ['storageId', 'filename'], true);
};

exports._meta = {
  version: 2
};
