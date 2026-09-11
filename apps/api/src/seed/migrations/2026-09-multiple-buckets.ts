// Defaults to a dry run. Pause bucket writes and take a backup before --apply.
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../../config/db';
import TermBucket from '../../models/apps/language/vocabulary/termBucket.model';
import QuizBucketPreference from '../../models/learning/quizBucketPreference.model';
import BucketEntry from '../../models/apps/language/vocabulary/bucketEntry.model';
import Profile from '../../models/core/profile.model';
import MiniApp from '../../models/core/miniApp.model';
import { ensureFavorites } from '../../modules/vocab/bucket.service';

export async function migrateMultipleBuckets(apply = false) {
  const legacy = { isFavorites: { $exists: false } };
  const entriesBefore = await BucketEntry.countDocuments();
  const legacyBefore = await TermBucket.collection.countDocuments(legacy);
  console.info({
    mode: apply ? 'apply' : 'dry-run',
    legacyBuckets: legacyBefore,
    entries: entriesBefore,
  });
  if (!apply) return;
  await TermBucket.collection.updateMany(legacy, {
    $set: {
      name: 'Favorites',
      description: '',
      color: '#FBBF24',
      visibility: 'private',
      isFavorites: true,
      includeInQuiz: true,
      revision: 0,
    },
  });
  await TermBucket.collection.createIndex(
    { profileId: 1, miniAppId: 1, isFavorites: 1 },
    {
      name: 'one_favorites_per_dictionary',
      unique: true,
      partialFilterExpression: { isFavorites: true },
    }
  );
  const dictionaries = await MiniApp.find({
    type: 'dictionary',
    isActive: true,
  }).select('_id');
  for await (const profile of Profile.find().select('_id').cursor()) {
    for (const dictionary of dictionaries)
      await ensureFavorites(profile._id.toString(), dictionary._id.toString());
  }
  // Removing the old unique index is essential: changing the Mongoose schema does not drop it.
  const indexes = await TermBucket.collection.indexes();
  for (const index of indexes) {
    if (
      index.unique &&
      Object.keys(index.key).length === 2 &&
      index.key.profileId === 1 &&
      index.key.miniAppId === 1 &&
      index.name
    ) {
      await TermBucket.collection.dropIndex(index.name);
    }
  }
  await TermBucket.createIndexes();
  await QuizBucketPreference.createIndexes();
  const entriesAfter = await BucketEntry.countDocuments();
  if (
    entriesAfter !== entriesBefore ||
    (await TermBucket.collection.countDocuments(legacy))
  )
    throw new Error(
      'Migration verification failed; keep bucket writes paused and inspect the backup.'
    );
  console.info({
    verified: true,
    entriesBefore,
    entriesAfter,
    convertedBuckets: legacyBefore,
  });
}
async function main() {
  // Share the API's SRV DNS setup without creating collections or indexes during a dry run.
  await connectDB({ autoIndex: false, autoCreate: false });
  await migrateMultipleBuckets(process.argv.includes('--apply'));
}
if (require.main === module) {
  main()
    .catch((error: unknown) => {
      console.error(
        error instanceof Error ? error.message : 'Migration failed'
      );
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
