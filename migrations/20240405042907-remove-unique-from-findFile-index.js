'use strict';

exports.migrate = async (db, opt) => {
  await db.removeIndex('file', 'findFile');
  await db.addIndex('file', 'findFile', ['storageId', 'filename'], false);
};

exports._meta = {
  version: 2
};
