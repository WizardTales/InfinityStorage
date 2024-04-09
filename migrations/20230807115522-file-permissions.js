'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return db.createTable('filePermission', {
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
        name: 'permission_file_fk',
        table: 'file',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    userId: {
      type: 'uuid',
      notNull: true
    },
    encryptionKey: {
      type: 'BYTES',
      notNull: false
    },
    // we don't need to search for this necessarily efficiently
    permissions: {
      type: 'INT2',
      notNull: false
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
