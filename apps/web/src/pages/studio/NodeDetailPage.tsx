// /studio/nodes/:nodeId — editable topic meta + its items[] (Lessons and Quizzes) in order.
// "+ Add Lesson"/"+ Add Quiz" create an empty draft immediately and navigate straight into
// editing it (Phase 4/5 pattern), rather than a separate multi-step create form. Item reorder
// isn't offered here — there's no backend endpoint for it (only node reorder and quiz-question
// reorder exist), so authored item order is fixed at creation time for v1.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, FileText, ListChecks } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchAllCourses,
  fetchNodeDetail,
  updateNode,
  createLesson,
  createQuiz,
} from '../../features/studio/studioSlice';
import CurriculumTagsEditor from '../../features/studio/components/CurriculumTagsEditor';
import type { ICurriculumTag } from '@my-backpack/shared';

export default function NodeDetailPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { allCourses, allCoursesLoaded, currentNode, isLoading, isMutating } = useSelector(
    (state: RootState) => state.studio
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curriculumTags, setCurriculumTags] = useState<ICurriculumTag[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isAddingQuiz, setIsAddingQuiz] = useState(false);

  useEffect(() => {
    if (!allCoursesLoaded) void dispatch(fetchAllCourses());
  }, [dispatch, allCoursesLoaded]);

  useEffect(() => {
    if (nodeId) void dispatch(fetchNodeDetail(nodeId));
  }, [dispatch, nodeId]);

  useEffect(() => {
    if (!currentNode) return;
    setTitle(currentNode.node.title);
    setDescription(currentNode.node.description ?? '');
    setCurriculumTags(currentNode.node.curriculumTags);
  }, [currentNode]);

  if (isLoading && !currentNode) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!currentNode || !nodeId) return null;

  const parentCourse = allCourses.find((c) => c.roadmapId === currentNode.node.roadmapId);

  const handleSave = async () => {
    const result = await dispatch(
      updateNode({
        nodeId,
        input: {
          title: title.trim(),
          description: description.trim() || undefined,
          curriculumTags,
        },
      })
    );
    if (updateNode.fulfilled.match(result)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const handleAddLesson = async () => {
    setIsAddingLesson(true);
    const result = await dispatch(
      createLesson({ nodeId, input: { title: 'Untitled Lesson', resources: [] } })
    );
    setIsAddingLesson(false);
    if (createLesson.fulfilled.match(result)) {
      navigate(`/studio/lessons/${result.payload._id}`);
    }
  };

  const handleAddQuiz = async () => {
    setIsAddingQuiz(true);
    const result = await dispatch(createQuiz({ nodeId, input: { title: 'Untitled Quiz' } }));
    setIsAddingQuiz(false);
    if (createQuiz.fulfilled.match(result)) {
      const quiz = result.payload;
      navigate(`/studio/quizzes/${quiz._id}?courseId=${quiz.miniAppId}&nodeId=${nodeId}`);
    }
  };

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() =>
          navigate(parentCourse ? `/studio/courses/${parentCourse._id}` : '/studio/courses')
        }
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> {parentCourse ? parentCourse.name : 'Courses'}
      </button>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{currentNode.node.title}</h1>

      {/* Meta */}
      <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm bg-white/60 border border-white/60 rounded-lg px-2.5 py-2"
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

        <div className="flex justify-end items-center gap-3 pt-1">
          {justSaved && <span className="text-xs text-green-600">Saved</span>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60 transition-colors"
          >
            {isMutating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">Items</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleAddLesson()}
            disabled={isAddingLesson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 disabled:opacity-60 transition-colors"
          >
            {isAddingLesson ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Lesson
          </button>
          <button
            type="button"
            onClick={() => void handleAddQuiz()}
            disabled={isAddingQuiz}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 disabled:opacity-60 transition-colors"
          >
            {isAddingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Quiz
          </button>
        </div>
      </div>

      {currentNode.items.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center bg-white/20 rounded-2xl border border-white/30">
          No items yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {currentNode.items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((item) => (
            <button
              key={item.itemId}
              type="button"
              onClick={() =>
                item.itemType === 'lesson'
                  ? navigate(`/studio/lessons/${item.itemId}`)
                  : navigate(
                      `/studio/quizzes/${item.itemId}?courseId=${parentCourse?._id ?? ''}&nodeId=${nodeId}`
                    )
              }
              className="flex items-center gap-3 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-3.5 text-left hover:bg-white/40 transition-colors"
            >
              {item.itemType === 'lesson' ? (
                <FileText className="w-4 h-4 text-teal-500 flex-shrink-0" />
              ) : (
                <ListChecks className="w-4 h-4 text-violet-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {item.itemType === 'lesson' ? item.lesson.title : item.quiz.title}
                </p>
                <p className="text-xs text-gray-400">
                  {item.itemType === 'lesson'
                    ? `Lesson · ${item.lesson.resources.length} resource${item.lesson.resources.length === 1 ? '' : 's'}`
                    : `Quiz · ${item.quiz.questionCount} question${item.quiz.questionCount === 1 ? '' : 's'}`}
                </p>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
