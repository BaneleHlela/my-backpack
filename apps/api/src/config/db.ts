import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  // Check if MONGODB_URI is defined in environment variables
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
