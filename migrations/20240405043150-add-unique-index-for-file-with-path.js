'use strict';

exports.migrate = async (db, opt) => {
  await db.addIndex(
    'file',
    'findFilePath',
    ['storageId', 'filename', 'path'],
    true
  );
};

exports._meta = {
  version: 2
};
