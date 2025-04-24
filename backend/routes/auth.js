const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('Received registration request:', req.body);
    
    const { fullName, username, email, phoneNumber, password, confirmPassword } = req.body;

    // Log the extracted data
    console.log('Extracted registration data:', {
      fullName,
      username,
      email,
      phoneNumber,
      passwordLength: password?.length,
      confirmPasswordLength: confirmPassword?.length
    });

    // Validate required fields
    if (!fullName || !username || !email || !phoneNumber || !password || !confirmPassword) {
      const missingFields = {
        fullName: !fullName,
        username: !username,
        email: !email,
        phoneNumber: !phoneNumber,
        password: !password,
        confirmPassword: !confirmPassword
      };
      console.log('Missing fields:', missingFields);
      
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists',
        field: existingUser.email === email ? 'email' : 'username'
      });
    }

    // Validate password match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.replace(/\D/g, '').slice(0, 10),
      password: hashedPassword
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('User registered successfully:', {
      email: user.email,
      username: user.username
    });

    res.status(201).json({ 
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error("Registration error:", {
      name: err.name,
      message: err.message,
      code: err.code
    });

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        message: `This ${field} is already in use`,
        field
      });
    }

    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log("Received login data:", req.body);

  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password are required',
      missingFields: {
        email: !email,
        password: !password
      }
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

module.exports = router;
