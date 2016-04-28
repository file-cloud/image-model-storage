module.exports = {
  type: 'oss',
  config: {
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    secretAccessKey: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    endpoint: process.env.ALIYUN_OSS_ENDPOINT,
    apiVersion: process.env.ALIYUN_OSS_APP_VERSION,
    Bucket: process.env.ALIYUN_OSS_BUCKET,
    base: process.env.ALIYUN_OSS_BASE
  }
};
