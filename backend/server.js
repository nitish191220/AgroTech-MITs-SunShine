const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./routes/auth');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// 1. CORS - Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// 2. Body parsing middleware
app.use(express.json({ limit: '50mb' })); // For parsing application/json
app.use(express.urlencoded({ 
  extended: true,
  limit: '50mb',
  parameterLimit: 50000
})); // For parsing application/x-www-form-urlencoded

// 3. Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// 4. Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    
    // Log successful connection
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });

    // Log connection errors
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    // Log disconnection
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from DB');
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize DB connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Welcome to the server!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  });
  
  res.status(500).json({ 
    message: "Server error",
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      name: err.name,
      code: err.code
    } : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
});



// cd frontend/agrimarket-frontend