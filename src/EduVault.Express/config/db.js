const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const uri = config.MONGO_URI || 'mongodb://localhost:27017/eduvault';
    const maskedUri = uri.replace(/:([^:@]+)@/, ':******@');
    console.log(`Connecting to MongoDB with URI: ${maskedUri}`);
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection warning: ${error.message}. Auxiliary service running in degraded mode.`);
  }
};

module.exports = connectDB;
