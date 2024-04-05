'use strict';

exports.migrate = async (db, opt) => {
  return db.addColumn('file', 'extFilename', {
    type: 'uuid',
    unique: false
  });
};

exports._meta = {
  version: 2
};
