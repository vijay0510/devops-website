

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

const s3 = new S3Client({
  region: 'ap-southeast-2'
});

const BUCKET_NAME = 'vijaydevops05';

// Upload gallery image
async function uploadImage(file) {
  return uploadToS3(file, 'images');
}

// Upload user profile photo
async function uploadProfileImage(file) {
  return uploadToS3(file, 'profiles');
}

// Common S3 upload function
async function uploadToS3(file, folder) {
  const extension = file.originalname.split('.').pop().toLowerCase();
  const key = `${folder}/${randomUUID()}.${extension}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  return key;
}

// Generate temporary URL
async function getImageUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return getSignedUrl(s3, command, {
    expiresIn: 3600
  });
}
// Generate URL only when thumbnail exists
async function getThumbnailUrl(profileKey) {
  if (!profileKey) return null;

  const filename = profileKey.split('/').pop();
  const nameWithoutExtension = filename.substring(
    0,
    filename.lastIndexOf('.')
  );

  const thumbnailKey = `thumbnails/${nameWithoutExtension}.jpg`;

  try {
    await s3.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: thumbnailKey
    }));

    return await getImageUrl(thumbnailKey);

  } catch (error) {
    if (
      error.name === 'NotFound' ||
      error.name === 'NoSuchKey' ||
      error.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}
// Generate temporary URL for profile thumbnail
async function getThumbnailUrl(profileKey) {
  if (!profileKey) return null;

  const filename = profileKey.split('/').pop();
  const nameWithoutExtension = filename.substring(
    0,
    filename.lastIndexOf('.')
  );

  const thumbnailKey = `thumbnails/${nameWithoutExtension}.jpg`;

  return getImageUrl(thumbnailKey);
}
// Delete S3 object
async function deleteImage(key) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  }));
}

module.exports = {
  uploadImage,
  uploadProfileImage,
  getImageUrl,
  getThumbnailUrl,
  deleteImage
};
