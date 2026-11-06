
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const app = express();
const pool = require('./database');
const db = require('./users');

const {
  uploadImage,
  uploadProfileImage,
  getImageUrl,
  getThumbnailUrl,
  deleteImage
} = require('./s3');
const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Multer image validation
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error('Only JPG, PNG, WebP and GIF images are allowed'));
    }

    callback(null, true);
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({
    info: 'Node.js, Express, PostgreSQL and S3 API'
  });
});

// Existing user routes
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, profile_image_key FROM users ORDER BY id ASC'
    );

    const users = await Promise.all(
      result.rows.map(async user => ({
        ...user,

        // Original profile image
        profile_image_url: user.profile_image_key
          ? await getImageUrl(user.profile_image_key)
          : null,

        // Lambda-generated thumbnail
        profile_thumbnail_url: user.profile_image_key
          ? await getThumbnailUrl(user.profile_image_key)
          : null
      }))
    );

    res.json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
app.get('/users/:id', db.getUserById);
app.post('/users/', upload.single('profileImage'), async (req, res) => {
  let profileKey;

  try {
    const { name, email } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        error: 'Name and email are required'
      });
    }

    if (req.file) {
      profileKey = await uploadProfileImage(req.file);
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, profile_image_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), email.trim(), profileKey || null]
    );

    res.status(201).json({
      message: 'User added successfully',
      user: {
        ...result.rows[0],

profile_image_url: profileKey
  ? await getImageUrl(profileKey)
  : null,

profile_thumbnail_url: null
 }
});

  } catch (error) {
    if (profileKey) {
      try {
        await deleteImage(profileKey);
      } catch (cleanupError) {
        console.error('Profile cleanup failed:', cleanupError.message);
      }
    }

    console.error('Profile upload error:', error);

    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});
app.patch('/users/:id', db.updateUser);
// Update user profile photo
app.put('/users/:id/profile', upload.single('profileImage'), async (req, res) => {
  let newProfileKey;

  try {
    const userId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a profile photo' });
    }

    // Check whether user exists and get old profile photo key
    const userResult = await pool.query(
      'SELECT id, profile_image_key FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldProfileKey = userResult.rows[0].profile_image_key;

    // Upload new photo to S3
    newProfileKey = await uploadProfileImage(req.file);

    // Generate URL before updating the database
    const newProfileUrl = await getImageUrl(newProfileKey);
    let thumbnailUrl = null;

try {
  thumbnailUrl = await getThumbnailUrl(newProfileKey);
} catch (error) {
  console.log('Thumbnail not ready yet:', error.message);
}

    // Update PostgreSQL with new S3 key
    await pool.query(
      'UPDATE users SET profile_image_key = $1 WHERE id = $2',
      [newProfileKey, userId]
    );

    // Delete old S3 photo only after database update succeeds
    if (oldProfileKey) {
      try {
        await deleteImage(oldProfileKey);
      } catch (deleteError) {
        console.error('Old profile photo deletion failed:', deleteError);
      }
    }

    res.json({
      message: 'Profile photo updated successfully',
      profile_image_key: newProfileKey,
      profile_image_url: newProfileUrl,
      profile_thumbnail_url: thumbnailUrl

    });

    // New upload is now saved; do not delete it.

  } catch (error) {
    // Clean up new upload if the update failed
    if (newProfileKey) {
      try {
        await deleteImage(newProfileKey);
      } catch (cleanupError) {
        console.error('New profile photo cleanup failed:', cleanupError);
      }
    }

    console.error('Profile update error:', error);

    res.status(500).json({
      error: 'Failed to update profile photo'
    });
  }
});
app.delete('/users/:id', db.deleteUser);

// Upload image and associate with user
app.post('/images', upload.single('image'), async (req, res) => {
  let uploadedKey;

  try {
    const userId = Number.parseInt(req.body.userId, 10);

    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'Valid user is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image' });
    }

    const user = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    uploadedKey = await uploadImage(req.file);

    const result = await pool.query(
      `INSERT INTO images (user_id, image_url, s3_key)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, uploadedKey, uploadedKey]
    );

    const imageUrl = await getImageUrl(uploadedKey);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        ...result.rows[0],
        url: imageUrl
      }
    });

  } catch (error) {
    if (uploadedKey) {
      try {
        await deleteImage(uploadedKey);
      } catch (deleteError) {
        console.error('S3 cleanup failed:', deleteError.message);
      }
    }

    console.error('Image upload error:', error);

    res.status(500).json({
      error: 'Failed to upload image'
    });
  }
});


// Retrieve gallery images and user profile photos
app.get('/images', async (req, res) => {
  try {
    // Get normal gallery images
    const galleryResult = await pool.query(`
      SELECT
        images.id,
        images.user_id,
        images.s3_key,
        images.created_at,
        users.name AS username,
        users.email
      FROM images
      INNER JOIN users ON users.id = images.user_id
      ORDER BY images.created_at DESC
    `);

    const galleryImages = await Promise.all(
      galleryResult.rows.map(async image => ({
        ...image,
        name: image.s3_key.split('/').pop(),
        url: await getImageUrl(image.s3_key),
        type: 'gallery'
      }))
    );

    // Get profile photos
    const profileResult = await pool.query(`
      SELECT
        id AS user_id,
        name AS username,
        email,
        profile_image_key AS s3_key
      FROM users
      WHERE profile_image_key IS NOT NULL
    `);

    const profileImages = await Promise.all(
  profileResult.rows.map(async user => ({
    id: `profile-${user.user_id}`,
    user_id: user.user_id,
    s3_key: user.s3_key,
    username: user.username,
    email: user.email,
    name: `${user.username}'s Profile Photo`,

    // Original image
    url: await getImageUrl(user.s3_key),

    // Lambda-generated thumbnail
    thumbnail_url: await getThumbnailUrl(user.s3_key),

    type: 'profile'
  }))
);

    // Combine both image types
    const images = [...profileImages, ...galleryImages];

    res.json({
      count: images.length,
      images
    });

  } catch (error) {
    console.error('Image retrieval error:', error);

    res.status(500).json({
      error: 'Failed to retrieve images'
    });
  }
});
// Multer and upload errors
// Delete image from S3 and PostgreSQL
app.delete('/images/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }

    const result = await pool.query(
      'SELECT s3_key FROM images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const key = result.rows[0].s3_key;

    await deleteImage(key);

    await pool.query(
      'DELETE FROM images WHERE id = $1',
      [id]
    );

    return res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Image deletion error:', error);
    return res.status(500).json({
      error: 'Failed to delete image'
    });
  }
});
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'Image must be smaller than 5 MB'
    });
  }

  if (error.message.startsWith('Only JPG')) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
