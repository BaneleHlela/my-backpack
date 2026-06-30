// Seeds accounts and their profiles. Idempotent — re-running updates existing records.
// findOneAndUpdate skips the password/pin pre-save hashing hooks, so passwords/pins are only
// ever set via $setOnInsert + a follow-up .save() the first time, never overwritten afterwards.
import Account from '../../models/core/account.model';
import Profile from '../../models/core/profile.model';
import { seedAccounts } from '../data/accounts.data';

export async function seedAccountsAndProfiles(): Promise<void> {
  console.log('Seeding accounts and profiles...');

  for (const accountData of seedAccounts) {
    const account = await Account.findOneAndUpdate(
      { email: accountData.email },
      { $setOnInsert: { email: accountData.email } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!account.password) {
      account.password = accountData.password;
      await account.save(); // pre-save hook hashes it
    }

    const profileIds: string[] = [];
    let ownerProfileId: string | undefined;

    for (const profileData of accountData.profiles) {
      const profile = await Profile.findOneAndUpdate(
        { accountId: account._id, displayName: profileData.displayName },
        {
          $set: {
            accountId: account._id,
            displayName: profileData.displayName,
            ageGroup: profileData.ageGroup,
            isOwner: profileData.isOwner,
            dateOfBirth: new Date(profileData.dateOfBirth),
            education: profileData.education,
            isSetupComplete: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (profileData.pin && !profile.pin) {
        profile.pin = profileData.pin;
        await profile.save(); // pre-save hook hashes it
      }

      profileIds.push(profile._id.toString());
      if (profileData.isOwner) ownerProfileId = profile._id.toString();
    }

    await Account.findByIdAndUpdate(account._id, {
      profiles: profileIds,
      activeProfile: ownerProfileId ?? profileIds[0],
    });
  }

  console.log(`  Seeded ${seedAccounts.length} account(s)`);
}
