// Fetches random distractor terms and definitions from the DB for MCQ question building.
// Uses MongoDB $sample aggregation for random selection so results vary across generation runs.
import { Types } from 'mongoose';
import Definition, { IDefinitionDocument } from '../../models/apps/language/vocabulary/definition.model';
import Term, { ITermDocument } from '../../models/apps/language/vocabulary/term.model';

// Fetches `count` random definitions from other terms in the same mini-app.
// Excludes ALL definitions belonging to the given term (not just one definitionId).
export async function fetchDefinitionDistractors(
  termId: string,
  miniAppId: string,
  count: number
): Promise<IDefinitionDocument[]> {
  const termObjectId = new Types.ObjectId(termId);
  const miniAppObjectId = new Types.ObjectId(miniAppId);

  const siblingDefinitionIds = await Definition.find({ termId: termObjectId }).distinct('_id');

  const results = await Definition.aggregate<IDefinitionDocument>([
    { $match: { _id: { $nin: siblingDefinitionIds } } },
    {
      $lookup: {
        from: 'terms',
        localField: 'termId',
        foreignField: '_id',
        as: 'term',
      },
    },
    { $unwind: '$term' },
    { $match: { 'term.miniAppId': miniAppObjectId } },
    { $sample: { size: count } },
    { $project: { term: 0 } },
  ]);

  return results;
}

// Fetches `count` random Term documents from the same mini-app excluding the current term.
export async function fetchTermDistractors(
  termId: string,
  miniAppId: string,
  count: number
): Promise<ITermDocument[]> {
  const termObjectId = new Types.ObjectId(termId);
  const miniAppObjectId = new Types.ObjectId(miniAppId);

  const results = await Term.aggregate<ITermDocument>([
    { $match: { _id: { $ne: termObjectId }, miniAppId: miniAppObjectId } },
    { $sample: { size: count } },
  ]);

  return results;
}
