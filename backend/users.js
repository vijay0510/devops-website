
const pool = require('./database');

const getUsers = async (request, response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM users ORDER BY id ASC'
    );

    return response.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return response.status(500).json({
      error: 'Failed to fetch users'
    });
  }
};

const createUser = async (request, response) => {
  try {
    const { name, email } = request.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      !name.trim() ||
      !email.trim()
    ) {
      return response.status(400).json({
        error: 'Name and email are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name.trim(), email.trim()]
    );

    return response.status(201).json({
      message: 'User added successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error.message);
    return response.status(500).json({
      error: 'Failed to create user'
    });
  }
};

const getUserById = async (request, response) => {
  try {
    const id = Number.parseInt(request.params.id, 10);

    if (!Number.isInteger(id) || id < 1) {
      return response.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return response.status(404).json({
        error: 'User not found'
      });
    }

    return response.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return response.status(500).json({
      error: 'Failed to fetch user'
    });
  }
};

const updateUser = async (request, response) => {
  try {
    const id = Number.parseInt(request.params.id, 10);
    const { name, email } = request.body;

    if (!Number.isInteger(id) || id < 1) {
      return response.status(400).json({
        error: 'Invalid user ID'
      });
    }

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      !name.trim() ||
      !email.trim()
    ) {
      return response.status(400).json({
        error: 'Name and email are required'
      });
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name.trim(), email.trim(), id]
    );

    if (result.rows.length === 0) {
      return response.status(404).json({
        error: 'User not found'
      });
    }

    return response.status(200).json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error.message);
    return response.status(500).json({
      error: 'Failed to update user'
    });
  }
};

const deleteUser = async (request, response) => {
  try {
    const id = Number.parseInt(request.params.id, 10);

    if (!Number.isInteger(id) || id < 1) {
      return response.status(400).json({
        error: 'Invalid user ID'
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return response.status(404).json({
        error: 'User not found'
      });
    }

    return response.status(200).json({
      message: 'User deleted successfully',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return response.status(500).json({
      error: 'Failed to delete user'
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser
};
