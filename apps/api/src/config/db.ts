import dns from 'dns';
import mongoose from 'mongoose';

// The local DNS resolver (often 127.0.0.1 via a VPN client or local proxy) can time out on
// SRV lookups even when the OS resolver handles them fine — this makes `mongodb+srv://` URIs
// fail to connect. Falling back to public DNS avoids that without touching the OS network config.
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDB(): Promise<void> {
  // Check if MONGODB_URI is defined in environment variables
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
