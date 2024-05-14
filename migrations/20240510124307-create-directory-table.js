'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  await db.createTable('directory', {
    id: {
      type: 'uuid',
      primaryKey: true,
      autoIncrement: true,
      notNull: true
    },
    name: {
      type: type.STRING,
      notNull: true
    },
    parentId: {
      type: 'uuid',
      notNull: false,
      foreignKey: {
        name: 'dir_parent_fk',
        table: 'directory',
        rules: {
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        mapping: 'id'
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
      }
    }
  });

  await db.addIndex('directory', 'findDirectory', ['name', 'parentId'], true);
};

exports._meta = {
  version: 2
};
