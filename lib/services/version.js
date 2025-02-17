import SQL from 'sql-template-tag';

export default {
  /**
   * @param {import('pg').Pool} pool
   * @param {String} fileId
   * @param {String} storageId
   */
  async listVersions (pool, fileId, storageId) {
    const query = SQL`SELECT v.version, f.* FROM version v
      INNER JOIN file f ON f.id = v."fileId"
      WHERE v."fileId" = ${fileId} AND f."storageId" = ${storageId}`;

    const { rows: versions } = await pool.query(query);

    return versions;
  },

  /**
   * @param {import('pg').Pool} pool
   * @param {String} fileId
   * @param {String} storageId
   */
  async getLatestVersion (pool, fileId, storageId) {
    const query = SQL`SELECT f.*, d.path FROM file f
      INNER JOIN directory d ON f."directoryId" = d.id
      WHERE f.id = ${fileId} AND f."storageId" = ${storageId}`;

    const {
      rows: [version]
    } = await pool.query(query);

    return version;
  },

  /**
   * @param {import('pg').Pool} pool
   * @param {String} fileId
   * @param {Number} version
   * @param {String} storageId
   */
  async getSpecificVersion (pool, fileId, version, storageId) {
    const query = SQL`SELECT v.*, f."storageId", d.path FROM version v
      INNER JOIN file f ON f.id = v."fileId"
      INNER JOIN directory d ON f."directoryId" = d.id
      WHERE v."fileId" = ${fileId}
      AND f."storageId" = ${storageId}
      AND v.version = ${version}`;

    const {
      rows: [data]
    } = await pool.query(query);

    return data;
  }
};
