
const {
  S3Client,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');

const {
  getSignedUrl
} = require('@aws-sdk/s3-request-presigner');

const {
  GetObjectCommand
} = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'ap-southeast-2'
});

const BUCKET_NAME = 'vijaydevops05';

async function getImages() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: 'images/'
  });

  const result = await s3.send(command);

  const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;

  const images = await Promise.all(
    (result.Contents || [])
      .filter(object =>
        object.Key && imageExtensions.test(object.Key)
      )
      .map(async object => {
        const imageCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });

        const url = await getSignedUrl(
          s3,
          imageCommand,
          { expiresIn: 3600 }
        );

        return {
          name: object.Key.split('/').pop(),
          key: object.Key,
          url,
          size: object.Size,
          lastModified: object.LastModified
        };
      })
  );

  return images;
}

module.exports = { getImages };
