'use strict';

exports.migrate = async (db, opt) => {
  await db.addColumn('user', 'globalDirId', {
    type: 'uuid',
    notNull: false,
    foreignKey: {
      name: 'user_directory_fk',
      table: 'directory',
      rules: {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      mapping: 'id'
    }
  });
  await db.addIndex('user', 'findUserDir', 'globalDirId', true);
};

exports._meta = {
  version: 2
};
