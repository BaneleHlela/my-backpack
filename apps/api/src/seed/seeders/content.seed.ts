// Seeds the content hierarchy: Field → Subject → Topic → MiniApp. Idempotent — re-running
// updates existing records. Returns lookup maps so downstream seeders can resolve ids by slug.
import Field from '../../models/core/field.model';
import Subject from '../../models/core/subject.model';
import Topic from '../../models/core/topic.model';
import MiniApp from '../../models/core/miniApp.model';
import { seedFields } from '../data/fields.data';
import { seedSubjects } from '../data/subjects.data';
import { seedTopics } from '../data/topics.data';

export interface ContentSeedResult {
  fieldMap: Map<string, string>; // slug -> _id
  subjectMap: Map<string, string>; // slug -> _id
  miniAppMap: Map<string, string>; // "subjectSlug/topicSlug/miniAppSlug" -> _id
}

export async function seedContentHierarchy(): Promise<ContentSeedResult> {
  console.log('Seeding content hierarchy...');

  const fieldMap = new Map<string, string>();
  for (const f of seedFields) {
    const field = await Field.findOneAndUpdate(
      { slug: f.slug },
      f,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    fieldMap.set(f.slug, field._id.toString());
  }

  const subjectMap = new Map<string, string>();
  for (const s of seedSubjects) {
    const fieldId = fieldMap.get(s.fieldSlug);
    if (!fieldId) throw new Error(`Field not found: ${s.fieldSlug}`);

    const subject = await Subject.findOneAndUpdate(
      { fieldId, slug: s.slug },
      { fieldId, name: s.name, slug: s.slug, description: s.description },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    subjectMap.set(s.slug, subject._id.toString());
  }

  const miniAppMap = new Map<string, string>();

  for (const t of seedTopics) {
    const subjectId = subjectMap.get(t.subjectSlug);
    if (!subjectId) throw new Error(`Subject not found: ${t.subjectSlug}`);

    const topic = await Topic.findOneAndUpdate(
      { subjectId, slug: t.slug },
      { subjectId, name: t.name, slug: t.slug, description: t.description },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const m of t.miniApps) {
      const miniApp = await MiniApp.findOneAndUpdate(
        { topicId: topic._id, slug: m.slug },
        {
          topicId: topic._id,
          name: m.name,
          slug: m.slug,
          type: m.type,
          description: m.description,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      miniAppMap.set(`${t.subjectSlug}/${t.slug}/${m.slug}`, miniApp._id.toString());
    }
  }

  console.log(
    `  Seeded ${seedFields.length} fields, ${seedSubjects.length} subjects, ${seedTopics.length} topics`
  );

  return { fieldMap, subjectMap, miniAppMap };
}
