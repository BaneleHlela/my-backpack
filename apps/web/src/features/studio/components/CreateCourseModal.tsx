// Course-create form: cascading Field -> Subject pickers (small, one-off local fetches —
// not worth caching in studioSlice for a form used in exactly one place), name, slug
// (auto-suggested from name until the author edits it directly), description, curriculum tags.
// A course's subject can't change after creation (UpdateCourseInput has no subjectId), so this
// modal is create-only — editing happens inline on the course detail page.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import api from '../../../lib/axios';
import { createCourse } from '../studioSlice';
import { slugify } from '../utils/slug';
import CurriculumTagsEditor from './CurriculumTagsEditor';
import Modal from './Modal';
import type { IField, ISubject, ICurriculumTag } from '@my-backpack/shared';

interface CreateCourseModalProps {
  onClose: () => void;
  onCreated: (courseId: string) => void;
}

export default function CreateCourseModal({ onClose, onCreated }: CreateCourseModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { isMutating } = useSelector((state: RootState) => state.studio);

  const [fields, setFields] = useState<IField[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [selectedField, setSelectedField] = useState<IField | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<ISubject | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [curriculumTags, setCurriculumTags] = useState<ICurriculumTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get('/content/fields').then((res) => setFields(res.data.data as IField[]));
  }, []);

  useEffect(() => {
    if (!selectedField) {
      setSubjects([]);
      setSelectedSubject(null);
      return;
    }
    setIsLoadingSubjects(true);
    setSelectedSubject(null);
    void api
      .get(`/content/fields/${selectedField.slug}/subjects`)
      .then((res) => setSubjects(res.data.data as ISubject[]))
      .finally(() => setIsLoadingSubjects(false));
  }, [selectedField]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selectedField || !selectedSubject) {
      setError('Choose a field and subject.');
      return;
    }
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.');
      return;
    }

    const result = await dispatch(
      createCourse({
        subjectId: selectedSubject._id,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        curriculumTags,
        fieldSlug: selectedField.slug,
        fieldName: selectedField.name,
        subjectSlug: selectedSubject.slug,
        subjectName: selectedSubject.name,
      })
    );

    if (createCourse.fulfilled.match(result)) {
      onCreated(result.payload._id);
    } else {
      setError((result.payload as string) ?? 'Failed to create course');
    }
  };

  return (
    <Modal title="New course" subtitle="A course wraps one roadmap under a subject" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Field</label>
            <select
              value={selectedField?._id ?? ''}
              onChange={(e) => setSelectedField(fields.find((f) => f._id === e.target.value) ?? null)}
              className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
            >
              <option value="">Select field…</option>
              {fields.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <select
              value={selectedSubject?._id ?? ''}
              onChange={(e) => setSelectedSubject(subjects.find((s) => s._id === e.target.value) ?? null)}
              disabled={!selectedField || isLoadingSubjects}
              className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 disabled:opacity-50"
            >
              <option value="">{isLoadingSubjects ? 'Loading…' : 'Select subject…'}</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Phonics"
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="e.g. phonics"
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Curriculum tags</label>
          <CurriculumTagsEditor value={curriculumTags} onChange={setCurriculumTags} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/60 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
          >
            {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Create course
          </button>
        </div>
      </div>
    </Modal>
  );
}
