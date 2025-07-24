import User, { findOne, findById } from '../models/User';  // Your User model
import { genSalt, hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

// Secret for JWT signing (should be in env variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// Register new user
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await genSalt(10);
    const hashedPassword = await hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Create JWT token
    const token = sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, user: { id: newUser._id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Login user
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Get current user (protected route)
export async function getCurrentUser(req, res) {
  try {
    // userId is extracted in auth middleware
    const user = await findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Logout (optional, just on client-side usually)
export function logout(req, res) {
  // Usually handled on client by deleting token
  res.json({ message: 'Logged out successfully' });
}
