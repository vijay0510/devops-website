
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
        profile_image_url: user.profile_image_key
          ? await getImageUrl(user.profile_image_key)
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
          : null
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

// Retrieve images with uploader details
app.get('/images', async (req, res) => {
  try {
    const result = await pool.query(`
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

    const images = await Promise.all(
      result.rows.map(async image => ({
        ...image,
        name: image.s3_key.split('/').pop(),
        url: await getImageUrl(image.s3_key)
      }))
    );

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
