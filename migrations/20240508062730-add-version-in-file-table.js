'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return db.addColumn('file', 'version', {
    type: type.SMALLINT,
    defaultValue: 0,
    notNull: true
  });
};

exports._meta = {
  version: 2
};
