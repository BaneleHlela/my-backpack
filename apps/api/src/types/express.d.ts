// Augments Express Request to carry decoded account and profile after auth middleware
import { IAccountDocument } from '../models/account.model';
import { IProfileDocument } from '../models/profile.model';

declare global {
  namespace Express {
    interface Request {
      account?: IAccountDocument;
      profile?: IProfileDocument;
    }
  }
}
