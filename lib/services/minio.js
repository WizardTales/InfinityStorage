import config from '../../config.js';

// export default {
/**
 * @param {import('minio').Client} client
 * @param {import('@fastify/multipart').MultipartFile} file
 */
export const uploadFile = async (client, file, objectname) => {
  if (await exists(client, objectname)) {
    throw new Error('File Already Exists');
  }

  const fileRes = await client.putObject(
    config.s3.bucket,
    objectname,
    file.file
  );

  return { code: 200, msg: { fileRes } };
};

/**
 * @param {import('minio').Client} client
 * @returns {Promise<Boolean>}
 */
export const exists = async (client, objectname) => {
  try {
    await stats(client, objectname);
    return true;
  } catch {
    return false;
  }
};

/**
 * @param {import('minio').Client} client
 * @returns {Promise<import('minio').BucketItemStat>}
 */
export const stats = async (client, objectname) => {
  return client.statObject(config.s3.bucket, objectname);
};

/**
 * @param {import('minio').Client} client
 * @returns {Promise<import('stream').Readable>}
 */
export const download = async (client, objectname) => {
  return client.getObjectA(config.s3.bucket, objectname);
};
