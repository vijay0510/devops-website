
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

const db = require('./users');
const { getImages } = require('./s3');

const port = 5050;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Health check
app.get('/', (request, response) => {
    response.json({
        info: 'Node.js, Express, PostgreSQL and S3 API'
    });
});

// Existing user routes
app.get('/users', db.getUsers);
app.get('/users/:id', db.getUserById);
app.post('/users/', db.createUser);
app.patch('/users/:id', db.updateUser);
app.delete('/users/:id', db.deleteUser);

// New S3 image route
app.get('/images', async (request, response) => {
    try {
        const images = await getImages();

        response.status(200).json({
            count: images.length,
            images
        });
    } catch (error) {
        console.error('S3 image error:', error);

        response.status(500).json({
            error: 'Failed to retrieve images from S3'
        });
    }
});

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});
