import config from '../../config.js';

export default {
  /**
   * @param {import('minio').Client} client
   * @param {import('@fastify/multipart').MultipartFile} file
   */
  uploadFile: async (client, file, objectname) => {
    const fileRes = await client.putObject(
      config.s3.bucket,
      objectname,
      file.file
    );

    return { code: 200, msg: { fileRes } };
  }
};
