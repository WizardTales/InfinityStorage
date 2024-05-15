'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  await db.createTable('version', {
    id: {
      type: 'uuid',
      primaryKey: true,
      autoIncrement: true,
      notNull: true
    },
    fileId: {
      type: 'uuid',
      notNull: true,
      foreignKey: {
        name: 'file_version_fk',
        table: 'file',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    version: {
      type: type.SMALLINT,
      defaultValue: 0,
      notNull: true
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
    extFilename: {
      type: 'uuid',
      unique: false
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
  return db.addIndex('version', 'findversion', ['fileId', 'version'], true);
};

exports._meta = {
  version: 2
};
