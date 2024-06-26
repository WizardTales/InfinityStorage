'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  await db.createTable('passwordReset', {
    id: {
      type: 'UUID',
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: 'uuid',
      notNull: false,
      foreignKey: {
        name: 'verify_user_fk',
        table: 'user',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
      }
    },
    token: {
      type: type.STRING,
      notNull: true
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
