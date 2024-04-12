'use strict';

exports.migrate = async (db, opt) => {
  const type = opt.dbm.dataType;
  await db.addColumn('file', 'locked', {
    type: type.BOOLEAN,
    default: 'false'
  });
};

exports._meta = {
  version: 2
};
