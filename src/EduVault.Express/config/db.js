const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./env');

// Set DNS servers to resolve MongoDB Atlas SRV records on Windows without ISP ECONNREFUSED issues
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if already set
}

const connectDB = async () => {
  try {
    const uri = config.MONGO_URI || 'mongodb://localhost:27017/eduvault';
    const maskedUri = uri.replace(/:([^:@]+)@/, ':******@');
    console.log(`Connecting to MongoDB with URI: ${maskedUri}`);
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`[INFO] MongoDB offline (${error.message}). Auxiliary service running in local fallback mode.`);
  }
};

module.exports = connectDB;
