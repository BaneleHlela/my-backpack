// /studio/courses/:courseId — editable course meta, linked mini-apps, and the ordered node
// ("Topic") list with drag-to-reorder. Node list comes from GET /roadmap/course/:courseId
// (already-public read, reused per the design doc's read/write split) rather than a new
// dashboard GET.
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Plus, Check, Search, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';
import {
  fetchAllCourses,
  fetchMiniAppsForSubject,
  fetchCourseNodes,
  updateCourse,
  reorderNodes,
  searchCourseQuestions,
  deleteQuestion,
} from '../../features/studio/studioSlice';
import AssetPicker from '../../features/studio/components/AssetPicker';
import CurriculumTagsEditor from '../../features/studio/components/CurriculumTagsEditor';
import AddNodeModal from '../../features/studio/components/AddNodeModal';
import SortableList, { DragHandle } from '../../features/studio/components/SortableList';
import { formatQuestionPreview } from '../../features/studio/utils/questionPreview';
import type { ICurriculumTag } from '@my-backpack/shared';

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    allCourses,
    allCoursesLoaded,
    subjectMiniApps,
    currentRoadmapNodes,
    questionSearchResults,
    isLoading,
    isMutating,
  } = useSelector((state: RootState) => state.studio);

  const course = allCourses.find((c) => c._id === courseId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState<string | undefined>(undefined);
  const [curriculumTags, setCurriculumTags] = useState<ICurriculumTag[]>([]);
  const [miniAppIds, setMiniAppIds] = useState<string[]>([]);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [localNodeOrder, setLocalNodeOrder] = useState<string[] | null>(null);
  const [questionSearch, setQuestionSearch] = useState('');

  useEffect(() => {
    if (!allCoursesLoaded) void dispatch(fetchAllCourses());
  }, [dispatch, allCoursesLoaded]);

  useEffect(() => {
    if (!course) return;
    setName(course.name);
    setDescription(course.description ?? '');
    setIconUrl(course.iconUrl);
    setCurriculumTags(course.curriculumTags);
    setMiniAppIds(course.miniAppIds);
  }, [course]);

  useEffect(() => {
    if (!course) return;
    void dispatch(fetchMiniAppsForSubject({ fieldSlug: course.fieldSlug, subjectSlug: course.subjectSlug }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, course?.fieldSlug, course?.subjectSlug]);

  useEffect(() => {
    if (courseId) void dispatch(fetchCourseNodes(courseId));
  }, [dispatch, courseId]);

  useEffect(() => {
    if (courseId) void dispatch(searchCourseQuestions({ courseId }));
  }, [dispatch, courseId]);

  useEffect(() => {
    setLocalNodeOrder(null);
  }, [currentRoadmapNodes]);

  if (allCoursesLoaded && !course) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Course not found.</p>
        <Link to="/studio/courses" className="text-violet-600 text-sm hover:underline mt-2 inline-block">
          Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const handleSave = async () => {
    const result = await dispatch(
      updateCourse({
        courseId: course._id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          iconUrl,
          miniAppIds,
          curriculumTags,
        },
      })
    );
    if (updateCourse.fulfilled.match(result)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const toggleMiniApp = (id: string) => {
    setMiniAppIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const orderedNodes = (currentRoadmapNodes ?? []).slice().sort((a, b) => a.position - b.position);
  const nodesForList = (
    localNodeOrder
      ? localNodeOrder.map((id) => orderedNodes.find((n) => n._id === id)).filter((n): n is typeof orderedNodes[number] => !!n)
      : orderedNodes
  ).map((n) => ({ ...n, id: n._id }));

  const handleReorder = (newItems: typeof nodesForList) => {
    const nodeIds = newItems.map((n) => n._id);
    setLocalNodeOrder(nodeIds);
    void dispatch(reorderNodes({ courseId: course._id, nodeIds })).then((result) => {
      if (!reorderNodes.fulfilled.match(result)) void dispatch(fetchCourseNodes(course._id));
    });
  };

  const handleAddQuestion = () => {
    navigate(`/studio/questions/new?courseId=${course._id}&returnTo=${encodeURIComponent(location.pathname)}`);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!window.confirm('Delete this question? This only removes it from the course question bank — it is a soft delete, so it stays intact if it is still used elsewhere.')) return;
    void dispatch(deleteQuestion(questionId));
  };

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/studio/courses')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Courses
      </button>

      <p className="text-xs font-medium text-gray-400 mb-1">
        {course.fieldName} / {course.subjectName}
      </p>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{course.name}</h1>

      {/* Meta */}
      <div className="bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-5 mb-6 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <AssetPicker assetType="images" value={iconUrl} onChange={setIconUrl} label="Icon" />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Curriculum tags</label>
          <CurriculumTagsEditor value={curriculumTags} onChange={setCurriculumTags} />
        </div>

        {subjectMiniApps.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Linked mini-apps</label>
            <div className="flex flex-wrap gap-2">
              {subjectMiniApps.map((app) => {
                const isLinked = miniAppIds.includes(app._id);
                return (
                  <button
                    key={app._id}
                    type="button"
                    onClick={() => toggleMiniApp(app._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors border ${
                      isLinked
                        ? 'bg-violet-100/80 border-violet-300 text-violet-700'
                        : 'bg-white/40 border-white/50 text-gray-600 hover:bg-white/60'
                    }`}
                  >
                    {isLinked && <Check className="w-3.5 h-3.5" />}
                    {app.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

      {/* Nodes */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800">Topics</h2>
        <button
          type="button"
          onClick={() => setIsAddNodeOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Topic
        </button>
      </div>

      {isLoading && nodesForList.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      )}

      {!isLoading && nodesForList.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center bg-white/20 rounded-2xl border border-white/30">
          No topics yet.
        </p>
      )}

      {nodesForList.length > 0 && (
        <SortableList
          items={nodesForList}
          onReorder={handleReorder}
          renderItem={(node, _idx, { dragHandleProps }) => (
            <div className="flex items-center gap-3 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-3.5">
              <DragHandle dragHandleProps={dragHandleProps} />
              <button
                type="button"
                onClick={() => navigate(`/studio/nodes/${node._id}`)}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-semibold text-gray-800 text-sm truncate">{node.title}</p>
                {node.description && (
                  <p className="text-xs text-gray-500 truncate">{node.description}</p>
                )}
              </button>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {node.items.length} item{node.items.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        />
      )}

      {isAddNodeOpen && (
        <AddNodeModal courseId={course._id} onClose={() => setIsAddNodeOpen(false)} />
      )}

      {/* Question Bank — every question scoped to this course (miniAppId === courseId),
          regardless of whether it's attached to a specific Topic's quiz. This is the same
          Question collection/search endpoint QuizEditorPage's "Pick existing" tab already
          reads (searchCourseQuestions) — this section is the first UI to reach question
          creation/browsing without going through a specific Quiz's "+ Add Question" modal
          (no addToQuiz param on the create link below), which is also what mobile's Quiz
          Modes "Game Quizzes" pool draws from. See docs/content/content-studio-design.md. */}
      <div className="flex items-center justify-between mb-3 mt-8">
        <h2 className="text-lg font-bold text-gray-800">Question Bank</h2>
        <button
          type="button"
          onClick={handleAddQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-100/80 text-violet-700 hover:bg-violet-200/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Every question here is available to mobile's Game Quizzes mode grid, whether or not it's
        also attached to a Topic's quiz.
      </p>

      <div className="flex items-center gap-2 bg-white/40 border border-white/50 rounded-lg px-2.5 py-1.5 mb-3">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <input
          value={questionSearch}
          onChange={(e) => setQuestionSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void dispatch(searchCourseQuestions({ courseId: course._id, search: questionSearch }));
          }}
          placeholder="Search this course's questions…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      {isLoading && questionSearchResults.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      )}

      {!isLoading && questionSearchResults.length === 0 && (
        <p className="text-sm text-gray-400 py-6 text-center bg-white/20 rounded-2xl border border-white/30">
          No questions in this course's bank yet.
        </p>
      )}

      {questionSearchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {questionSearchResults.map((q) => (
            <div
              key={q._id}
              className="flex items-center gap-3 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/40 p-3.5"
            >
              <button
                type="button"
                onClick={() => navigate(`/studio/questions/${q._id}?courseId=${course._id}`)}
                className="flex-1 text-left min-w-0"
              >
                <p className="font-semibold text-gray-800 text-sm truncate">{formatQuestionPreview(q)}</p>
                <p className="text-xs text-gray-400">{q.type}</p>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteQuestion(q._id)}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
