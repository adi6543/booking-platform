const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Error connecting to MongoDB: ${error.message}. Attempting to use in-memory database for testing...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`In-memory MongoDB Connected: ${mongoUri}`);
    } catch (inMemoryError) {
      console.error(`In-memory MongoDB failed: ${inMemoryError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
