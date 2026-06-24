// Derives content preferences from req.profile.ageGroup and attaches them to req.contentPrefs.
import { Request, Response, NextFunction } from 'express';
import { AgeGroup } from '../models/core/profile.model';
import { QuestionType } from '../models/apps/language/vocabulary/question.model';
import { sendError } from '../utils/response';

export interface ContentPrefs {
  ageGroup: AgeGroup;
  maxDefinitions: number;
  simplifiedLanguage: boolean;
  allowedQuestionTypes: QuestionType[];
}

export function attachContentPrefs(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.profile) {
    sendError(res, 'Profile required', 403);
    return;
  }

  const ageGroup = req.profile.ageGroup;
  let prefs: ContentPrefs;

  switch (ageGroup) {
    case 'child':
      prefs = {
        ageGroup,
        maxDefinitions: 1,
        simplifiedLanguage: true,
        allowedQuestionTypes: ['mcq', 'true_false', 'word_to_def'],
      };
      break;
    case 'teen':
      prefs = {
        ageGroup,
        maxDefinitions: 2,
        simplifiedLanguage: false,
        allowedQuestionTypes: ['mcq', 'true_false', 'word_to_def', 'def_to_word', 'fill_blank'],
      };
      break;
    default:
      prefs = {
        ageGroup,
        maxDefinitions: 10,
        simplifiedLanguage: false,
        allowedQuestionTypes: [
          'mcq',
          'true_false',
          'word_to_def',
          'def_to_word',
          'fill_blank',
          'text_input',
          'voice',
        ],
      };
  }

  req.contentPrefs = prefs;
  next();
}
