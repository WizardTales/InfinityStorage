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

  const fileRes = await client.putObjectA(config.s3.bucket, objectname, file);

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

/**
 * @param {import('minio').Client} client
 */
export const deleteObject = async (client, objectname) => {
  await client.removeObject(config.s3.bucket, objectname);
};
