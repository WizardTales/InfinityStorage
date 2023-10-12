'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  return db.addColumn('user', 'role', {
    type: type.SMALLINT,
    notNull: true,
    defaultValue: 0
  });
};

exports._meta = {
  version: 2
};
