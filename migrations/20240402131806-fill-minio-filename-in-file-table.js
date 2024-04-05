'use strict';

exports.migrate = async (db, opt) => {
  await db.udriver.runSql('UPDATE "file" SET "extFilename" = id');
};

exports._meta = {
  version: 2
};
