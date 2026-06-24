// Augments Express Request to carry decoded account, profile, and content preferences after auth middleware
import { IAccountDocument } from '../models/core/account.model';
import { IProfileDocument } from '../models/core/profile.model';
import { ContentPrefs } from '../middleware/ageGroup.middleware';

declare global {
  namespace Express {
    interface Request {
      account?: IAccountDocument;
      profile?: IProfileDocument;
      contentPrefs: ContentPrefs;
    }
  }
}
