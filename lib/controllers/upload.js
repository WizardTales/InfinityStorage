import { fileTypeStream } from 'file-type';
import config from '../../config.js';
const { s3: s3Config } = config;

export default {
  async d1 (request, reply) {
    const authenticator = request.sp;
    console.log(authenticator.auth, authenticator.challenge);
    return { code: 200, msg: 'success' };
  },

  async createStorage (request, h) {
    const session = request.auth.credentials;
    const {
      msg: { storage }
    } = await request.seneca.actAsync(
      'service:user,command:create,asset:storage',
      {
        session
      }
    );
    return {};
  },

  async getStorage (request, h) {
    const { storageId } = request.params;
    const ip = request.info.remoteAddress;
    const session = request.auth.credentials;
    const res = await request.seneca.actAsync(
      'service:user,command:get,asset:files',
      {
        session,
        data: {
          storageId
        }
      }
    );

    if (res.code > 299) {
      return h.response({ code: res.code, msg: res.msg }).code(res.code);
    }

    return { code: 200, msg: res.msg };
  },

  async deleteFile (request, h) {
    const { fileId: id } = request.params;
    const ip = request.info.remoteAddress;
    const session = request.auth.credentials;
    const { s3 } = request.server;

    let res = await request.seneca.actAsync(
      'service:user,command:delete,asset:file',
      {
        session,
        data: { id }
      }
    );

    if (res.code > 299) {
      return h.response({ code: res.code, msg: res.msg }).code(res.code);
    }

    const { storageId, filename } = res.msg;

    await new Promise((resolve, reject) => {
      s3.removeObject(s3Config.bucket, `${storageId}/${filename}`, (err) => {
        if (err) {
          console.log(err);
          return reject(err);
        }

        resolve();
      });
    });

    res = await request.seneca.actAsync(
      'service:user,command:delete,asset:file',
      {
        session,
        data: { id, finalize: true }
      }
    );

    if (res.code > 299) {
      return h.response({ code: res.code, msg: res.msg }).code(res.code);
    }

    return { code: 200, msg: 'success' };
  },

  async upload (request, h) {
    const { storageId, data: file } = request.payload;
    const { s3 } = request.server;
    const ip = request.info.remoteAddress;
    const fileStream = await fileTypeStream(file);
    const mime = fileStream.fileType;
    const session = request.auth.credentials;
    console.log(fileStream.fileType, file.hapi);

    const res = await request.seneca.actAsync(
      'service:user,command:check,asset:storageReq',
      {
        session,
        data: { filename: file.hapi.filename, mime, ip, storageId }
      }
    );

    console.log(res);
    if (res.code > 299) {
      return h.response({ code: res.code, msg: res.msg }).code(res.code);
    }

    const filename = res.msg.filename;

    const {
      msg: { file: fileRef }
    } = await request.seneca.actAsync(
      'service:user,command:create,asset:file',
      {
        session,
        data: { filename, mime, ip, storageId }
      }
    );

    await new Promise((resolve, reject) => {
      s3.putObject(
        s3Config.bucket,
        `${storageId}/${fileRef.id}`,
        fileStream,
        (err) => {
          if (err) {
            console.log(err);
            return reject(err);
          }

          resolve();
        }
      );
    });

    request.seneca.act('service:user,command:update,asset:file', {
      session,
      data: { id: fileRef.id, state: 0 }
    });

    return { code: 200, msg: 'success' };
  },

  async download (request, h) {
    const { fileId: id } = request.params;
    console.log(request.params);
    const { s3 } = request.server;
    const session = request.auth.credentials;
    const ip = request.info.remoteAddress;

    const res = await request.seneca.actAsync(
      'service:user,command:get,asset:file',
      {
        session,
        data: { id, ip }
      }
    );

    if (res.code > 299) {
      return h.response({ code: res.code, msg: res.msg }).code(res.code);
    }

    if (!res.msg) {
      return h.response({ code: 404 }).code(404);
    }

    const { storageId } = res.msg;

    const file = await new Promise((resolve, reject) => {
      s3.presignedGetObject(
        s3Config.bucket,
        `${storageId}/${id}`,
        15,
        (err, url) => {
          if (err) {
            return reject(err);
          }

          resolve(url);
        }
      );
    });

    return { url: file, encryptionKey: null };
  }
};
