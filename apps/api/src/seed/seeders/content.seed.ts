// Seeds the content hierarchy: Field → Subject → MiniApp. Idempotent — re-running
// updates existing records. Returns lookup maps so downstream seeders can resolve ids by slug.
import Field from '../../models/core/field.model';
import Subject from '../../models/core/subject.model';
import MiniApp from '../../models/core/miniApp.model';
import { seedFields } from '../data/fields.data';
import { seedSubjects } from '../data/subjects.data';
import { seedMiniApps } from '../data/miniapps.data';

export interface ContentSeedResult {
  fieldMap: Map<string, string>; // slug -> _id
  subjectMap: Map<string, string>; // slug -> _id
  miniAppMap: Map<string, string>; // "subjectSlug/miniAppSlug" -> _id
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

  for (const m of seedMiniApps) {
    const subjectId = subjectMap.get(m.subjectSlug);
    if (!subjectId) throw new Error(`Subject not found: ${m.subjectSlug}`);

    const miniApp = await MiniApp.findOneAndUpdate(
      { subjectId, slug: m.slug },
      {
        subjectId,
        name: m.name,
        slug: m.slug,
        type: m.type,
        description: m.description,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    miniAppMap.set(`${m.subjectSlug}/${m.slug}`, miniApp._id.toString());
  }

  console.log(
    `  Seeded ${seedFields.length} fields, ${seedSubjects.length} subjects, ${seedMiniApps.length} mini-apps`
  );

  return { fieldMap, subjectMap, miniAppMap };
}
