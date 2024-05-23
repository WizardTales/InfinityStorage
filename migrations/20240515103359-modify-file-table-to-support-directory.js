'use strict';

exports.migrate = async (db, opt) => {
  await db.addColumn('file', 'directoryId', {
    type: 'uuid',
    notNull: false,
    foreignKey: {
      name: 'file_directory_fk',
      table: 'directory',
      rules: {
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      mapping: 'id'
    }
  });

  await db.addIndex(
    'file',
    'findFileDir',
    ['storageId', 'filename', 'directoryId'],
    true
  );
};

exports._meta = {
  version: 2
};
