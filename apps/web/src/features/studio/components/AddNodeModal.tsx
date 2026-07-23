// Small "+ Add Topic" form on the course detail page — title, description, slug
// (auto-suggested from title), curriculum tags. Posts to
// POST /api/dashboard/courses/:courseId/nodes.
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../app/store';
import { createNode, fetchCourseNodes } from '../studioSlice';
import { slugify } from '../utils/slug';
import CurriculumTagsEditor from './CurriculumTagsEditor';
import Modal from './Modal';
import type { ICurriculumTag } from '@my-backpack/shared';

interface AddNodeModalProps {
  courseId: string;
  onClose: () => void;
}

export default function AddNodeModal({ courseId, onClose }: AddNodeModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { isMutating } = useSelector((state: RootState) => state.studio);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [curriculumTags, setCurriculumTags] = useState<ICurriculumTag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required.');
      return;
    }

    const result = await dispatch(
      createNode({
        courseId,
        input: {
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          curriculumTags,
        },
      })
    );

    if (createNode.fulfilled.match(result)) {
      await dispatch(fetchCourseNodes(courseId));
      onClose();
    } else {
      setError((result.payload as string) ?? 'Failed to create topic');
    }
  };

  return (
    <Modal title="Add topic" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Vowel Sounds"
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
            Add topic
          </button>
        </div>
      </div>
    </Modal>
  );
}
