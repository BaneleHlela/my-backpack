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
        allowedQuestionTypes: ['mcq_term_to_def', 'true_false_term_def', 'text_input_def', 'mcq_audio'],
      };
      break;
    case 'teen':
      prefs = {
        ageGroup,
        maxDefinitions: 2,
        simplifiedLanguage: false,
        allowedQuestionTypes: [
          'mcq_term_to_def',
          'mcq_def_to_term',
          'mcq_fill_blank',
          'fill_blank_typed',
          'true_false_term_def',
          'true_false_def_term',
          'text_input_def',
          'mcq_audio',
        ],
      };
      break;
    default:
      prefs = {
        ageGroup,
        maxDefinitions: 10,
        simplifiedLanguage: false,
        allowedQuestionTypes: [
          'mcq_term_to_def',
          'mcq_def_to_term',
          'mcq_correct_usage',
          'mcq_incorrect_usage',
          'mcq_fill_blank',
          'fill_blank_typed',
          'true_false_term_def',
          'true_false_def_term',
          'true_false_usage',
          'text_input_def',
          'text_input_audio',
          'text_input_example',
          'mcq_audio',
        ],
      };
  }

  req.contentPrefs = prefs;
  next();
}
