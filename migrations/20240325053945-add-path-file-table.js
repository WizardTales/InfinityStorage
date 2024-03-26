'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return db.addColumn('file', 'path', {
    type: type.STRING,
    notNull: true
  });
};

exports._meta = {
  version: 2
};
