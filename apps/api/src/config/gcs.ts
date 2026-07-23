// Google Cloud Storage client for the shared asset bucket.
import { Storage, Bucket } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEY_FILE || undefined, // falls back to Application Default
  // Credentials (GOOGLE_APPLICATION_CREDENTIALS) when unset — e.g. in production on Render
});

export const bucket: Bucket = storage.bucket(process.env.GCS_BUCKET_NAME ?? 'my-backpack-assets');
