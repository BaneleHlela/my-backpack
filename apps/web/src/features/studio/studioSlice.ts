// Content Studio state: course -> node -> lesson/quiz -> question, one connected authoring
// flow always navigated in that order, so it's a single slice rather than split further.
//
// Reads mostly reuse existing public/learner-facing endpoints (per
// docs/content/content-studio-design.md's "read vs write split") rather than adding new
// dashboard GETs:
//   - course list: aggregated client-side from /content/fields -> .../subjects -> .../courses
//   - node list for a course: GET /roadmap/course/:courseId (nodes[] with resolved item summaries)
//   - node detail: GET /roadmap/node/:nodeId (items[] resolved to lesson docs / quiz summaries)
//   - lesson detail: GET /roadmap/lesson/:lessonId
//   - quiz detail: GET /dashboard/quizzes/:quizId (added alongside Part 2's course-flow CRUD —
//     the original plan relied on GET /quiz/quizzes?miniAppId=<courseId> + client-side find,
//     which silently produced a blank QuizEditorPage whenever a course had no miniAppId to
//     query by; this is a real dashboard GET, mutation-gated like the rest of /api/dashboard/*)
//   - question detail/search: GET /dashboard/questions?courseId=&search= (already gated + scoped)
// Only mutations go through /api/dashboard/*.
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/axios';
import type {
  ICourseSummary,
  IField,
  ISubject,
  IMiniApp,
  ICurriculumTag,
  IRoadmapNode,
  RoadmapWithProgress,
  NodeItemWithProgress,
  ILesson,
  IResource,
  IQuiz,
  QuizSettings,
  IQuestion,
  QuestionType,
  IQuestionContent,
} from '@my-backpack/shared';

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? fallback;
}

// ── Types ────────────────────────────────────────────────

export interface StudioCourseEntry {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  miniAppIds: string[];
  curriculumTags: ICurriculumTag[];
  isActive: boolean;
  roadmapId?: string;
  roadmapTitle: string;
  nodeCount: number;
  fieldSlug: string;
  fieldName: string;
  subjectSlug: string;
  subjectName: string;
}

interface StudioCourseRaw {
  _id: string;
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  roadmapId?: string;
  miniAppIds: (string | { _id: string })[];
  curriculumTags: ICurriculumTag[];
  isActive: boolean;
}

function normalizeMiniAppIds(ids: (string | { _id: string })[]): string[] {
  return ids.map((id) => (typeof id === 'string' ? id : id._id));
}

function toStudioCourseEntry(
  raw: StudioCourseRaw,
  ctx: { fieldSlug: string; fieldName: string; subjectSlug: string; subjectName: string },
  fallback?: Partial<Pick<StudioCourseEntry, 'roadmapTitle' | 'nodeCount'>>
): StudioCourseEntry {
  return {
    _id: raw._id,
    subjectId: raw.subjectId,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    iconUrl: raw.iconUrl,
    miniAppIds: normalizeMiniAppIds(raw.miniAppIds ?? []),
    curriculumTags: raw.curriculumTags ?? [],
    isActive: raw.isActive,
    roadmapId: raw.roadmapId,
    roadmapTitle: fallback?.roadmapTitle ?? `${raw.name} Roadmap`,
    nodeCount: fallback?.nodeCount ?? 0,
    ...ctx,
  };
}

export type RoadmapNodeSummary = RoadmapWithProgress['nodes'][number];

export interface NodeDetail {
  node: IRoadmapNode;
  items: NodeItemWithProgress[];
}

interface StudioState {
  allCourses: StudioCourseEntry[];
  allCoursesLoaded: boolean;
  subjectMiniApps: IMiniApp[];

  currentCourse: StudioCourseEntry | null;
  currentRoadmapNodes: RoadmapNodeSummary[] | null;

  currentNode: NodeDetail | null;
  currentLesson: ILesson | null;
  currentQuiz: IQuiz | null;

  // Every question fetched so far this session, keyed by id — used to render preview rows
  // (quiz question list, node quiz previews) without losing data when a search narrows results.
  questionCache: Record<string, IQuestion>;
  questionSearchResults: IQuestion[];
  currentQuestion: IQuestion | null;

  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
}

const initialState: StudioState = {
  allCourses: [],
  allCoursesLoaded: false,
  subjectMiniApps: [],
  currentCourse: null,
  currentRoadmapNodes: null,
  currentNode: null,
  currentLesson: null,
  currentQuiz: null,
  questionCache: {},
  questionSearchResults: [],
  currentQuestion: null,
  isLoading: false,
  isMutating: false,
  error: null,
};

// ── Thunks: courses ──────────────────────────────────────

export const fetchAllCourses = createAsyncThunk(
  'studio/fetchAllCourses',
  async (_: void, { rejectWithValue }) => {
    try {
      const fieldsRes = await api.get('/content/fields');
      const fields = fieldsRes.data.data as IField[];

      const entries: StudioCourseEntry[] = [];

      await Promise.all(
        fields.map(async (field) => {
          const subjectsRes = await api.get(`/content/fields/${field.slug}/subjects`);
          const subjects = subjectsRes.data.data as ISubject[];

          await Promise.all(
            subjects.map(async (subject) => {
              const coursesRes = await api.get(
                `/content/fields/${field.slug}/subjects/${subject.slug}/courses`
              );
              const courses = coursesRes.data.data as ICourseSummary[];
              for (const course of courses) {
                const entry = toStudioCourseEntry(
                  {
                    ...course,
                    roadmapId: course.roadmap._id,
                    miniAppIds: course.miniAppIds as (string | { _id: string })[],
                  },
                  {
                    fieldSlug: field.slug,
                    fieldName: field.name,
                    subjectSlug: subject.slug,
                    subjectName: subject.name,
                  },
                  { roadmapTitle: course.roadmap.title, nodeCount: course.roadmap.nodeCount }
                );
                entries.push(entry);
              }
            })
          );
        })
      );

      return entries;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load courses'));
    }
  }
);

export const fetchMiniAppsForSubject = createAsyncThunk(
  'studio/fetchMiniAppsForSubject',
  async ({ fieldSlug, subjectSlug }: { fieldSlug: string; subjectSlug: string }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/content/fields/${fieldSlug}/subjects/${subjectSlug}/miniapps`);
      return res.data.data as IMiniApp[];
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load mini-apps'));
    }
  }
);

export interface CreateCourseArgs {
  subjectId: string;
  name: string;
  slug: string;
  description?: string;
  curriculumTags?: ICurriculumTag[];
  fieldSlug: string;
  fieldName: string;
  subjectSlug: string;
  subjectName: string;
}

export const createCourse = createAsyncThunk(
  'studio/createCourse',
  async (input: CreateCourseArgs, { rejectWithValue }) => {
    try {
      const { fieldSlug, fieldName, subjectSlug, subjectName, ...payload } = input;
      const res = await api.post('/dashboard/courses', payload);
      const raw = res.data.data as StudioCourseRaw;
      return toStudioCourseEntry(raw, { fieldSlug, fieldName, subjectSlug, subjectName });
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create course'));
    }
  }
);

export interface UpdateCourseInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  miniAppIds?: string[];
  curriculumTags?: ICurriculumTag[];
}

export const updateCourse = createAsyncThunk(
  'studio/updateCourse',
  async ({ courseId, input }: { courseId: string; input: UpdateCourseInput }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/dashboard/courses/${courseId}`, input);
      return res.data.data as StudioCourseRaw;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update course'));
    }
  }
);

export const deleteCourse = createAsyncThunk(
  'studio/deleteCourse',
  async (courseId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard/courses/${courseId}`);
      return courseId;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete course'));
    }
  }
);

// ── Thunks: nodes ────────────────────────────────────────

export const fetchCourseNodes = createAsyncThunk(
  'studio/fetchCourseNodes',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/roadmap/course/${courseId}`);
      return (res.data.data as RoadmapWithProgress).nodes;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load nodes'));
    }
  }
);

export interface CreateNodeInput {
  title: string;
  slug: string;
  description?: string;
  curriculumTags?: ICurriculumTag[];
}

export const createNode = createAsyncThunk(
  'studio/createNode',
  async ({ courseId, input }: { courseId: string; input: CreateNodeInput }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/dashboard/courses/${courseId}/nodes`, input);
      return res.data.data as IRoadmapNode;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create topic'));
    }
  }
);

export const reorderNodes = createAsyncThunk(
  'studio/reorderNodes',
  async ({ courseId, nodeIds }: { courseId: string; nodeIds: string[] }, { rejectWithValue }) => {
    try {
      await api.patch(`/dashboard/courses/${courseId}/nodes/reorder`, { nodeIds });
      return nodeIds;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to reorder topics'));
    }
  }
);

export const fetchNodeDetail = createAsyncThunk(
  'studio/fetchNodeDetail',
  async (nodeId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/roadmap/node/${nodeId}`);
      const data = res.data.data as { node: IRoadmapNode; items: NodeItemWithProgress[] };
      return { node: data.node, items: data.items };
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load topic'));
    }
  }
);

export interface UpdateNodeInput {
  title?: string;
  description?: string;
  curriculumTags?: ICurriculumTag[];
  unlockRequires?: string[];
  rewards?: { xp?: number; peanuts?: number; badge?: string };
}

export const updateNode = createAsyncThunk(
  'studio/updateNode',
  async ({ nodeId, input }: { nodeId: string; input: UpdateNodeInput }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/dashboard/nodes/${nodeId}`, input);
      return res.data.data as IRoadmapNode;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update topic'));
    }
  }
);

export const deleteNode = createAsyncThunk(
  'studio/deleteNode',
  async (nodeId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard/nodes/${nodeId}`);
      return nodeId;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete topic'));
    }
  }
);

// ── Thunks: lessons ──────────────────────────────────────

export interface CreateLessonInput {
  title: string;
  resources: IResource[];
}

export const createLesson = createAsyncThunk(
  'studio/createLesson',
  async ({ nodeId, input }: { nodeId: string; input: CreateLessonInput }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/dashboard/nodes/${nodeId}/lessons`, input);
      return res.data.data as ILesson;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create lesson'));
    }
  }
);

export const fetchLessonDetail = createAsyncThunk(
  'studio/fetchLessonDetail',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/roadmap/lesson/${lessonId}`);
      const data = res.data.data as { lesson: ILesson };
      return data.lesson ?? (res.data.data as ILesson);
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load lesson'));
    }
  }
);

export interface UpdateLessonInput {
  title?: string;
  resources?: IResource[];
}

export const updateLesson = createAsyncThunk(
  'studio/updateLesson',
  async ({ lessonId, input }: { lessonId: string; input: UpdateLessonInput }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/dashboard/lessons/${lessonId}`, input);
      return res.data.data as ILesson;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to save lesson'));
    }
  }
);

export const deleteLesson = createAsyncThunk(
  'studio/deleteLesson',
  async (lessonId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard/lessons/${lessonId}`);
      return lessonId;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete lesson'));
    }
  }
);

// ── Thunks: quizzes ──────────────────────────────────────

export interface CreateQuizInput {
  title: string;
  settings?: Partial<QuizSettings>;
}

export const createQuiz = createAsyncThunk(
  'studio/createQuiz',
  async ({ nodeId, input }: { nodeId: string; input: CreateQuizInput }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/dashboard/nodes/${nodeId}/quizzes`, input);
      return res.data.data as IQuiz;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create quiz'));
    }
  }
);

export const fetchQuizDetail = createAsyncThunk(
  'studio/fetchQuizDetail',
  async (quizId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/dashboard/quizzes/${quizId}`);
      return res.data.data as IQuiz;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load quiz'));
    }
  }
);

export interface UpdateQuizInput {
  title?: string;
  settings?: Partial<QuizSettings>;
}

export const updateQuiz = createAsyncThunk(
  'studio/updateQuiz',
  async ({ quizId, input }: { quizId: string; input: UpdateQuizInput }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/dashboard/quizzes/${quizId}`, input);
      return res.data.data as IQuiz;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to save quiz'));
    }
  }
);

export const updateQuizQuestions = createAsyncThunk(
  'studio/updateQuizQuestions',
  async (
    { quizId, questionIds }: { quizId: string; questionIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.patch(`/dashboard/quizzes/${quizId}/questions`, { questionIds });
      return res.data.data as IQuiz;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update quiz questions'));
    }
  }
);

export const deleteQuiz = createAsyncThunk(
  'studio/deleteQuiz',
  async (quizId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard/quizzes/${quizId}`);
      return quizId;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete quiz'));
    }
  }
);

// ── Thunks: questions ────────────────────────────────────

export const searchCourseQuestions = createAsyncThunk(
  'studio/searchCourseQuestions',
  async ({ courseId, search }: { courseId: string; search?: string }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ courseId });
      if (search) params.set('search', search);
      const res = await api.get(`/dashboard/questions?${params.toString()}`);
      return res.data.data as IQuestion[];
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to search questions'));
    }
  }
);

export const fetchQuestionDetail = createAsyncThunk(
  'studio/fetchQuestionDetail',
  async ({ courseId, questionId }: { courseId: string; questionId: string }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/dashboard/questions?courseId=${courseId}`);
      const questions = res.data.data as IQuestion[];
      const question = questions.find((q) => q._id === questionId);
      if (!question) return rejectWithValue('Question not found');
      return question;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to load question'));
    }
  }
);

export interface CreateQuestionInput {
  courseId: string;
  type: QuestionType;
  content: IQuestionContent;
  termId?: string;
  definitionId?: string;
  maxPoints?: number;
  pointsCanBePartial?: boolean;
}

export const createQuestion = createAsyncThunk(
  'studio/createQuestion',
  async (input: CreateQuestionInput, { rejectWithValue }) => {
    try {
      const res = await api.post('/dashboard/questions', input);
      return res.data.data as IQuestion;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create question'));
    }
  }
);

export interface UpdateQuestionInput {
  content?: IQuestionContent;
  maxPoints?: number;
  pointsCanBePartial?: boolean;
}

export const updateQuestion = createAsyncThunk(
  'studio/updateQuestion',
  async (
    { questionId, input }: { questionId: string; input: UpdateQuestionInput },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.patch(`/dashboard/questions/${questionId}`, input);
      return res.data.data as IQuestion;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to save question'));
    }
  }
);

export const deleteQuestion = createAsyncThunk(
  'studio/deleteQuestion',
  async (questionId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/dashboard/questions/${questionId}`);
      return questionId;
    } catch (err: unknown) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete question'));
    }
  }
);

// ── Slice ────────────────────────────────────────────────

const studioSlice = createSlice({
  name: 'studio',
  initialState,
  reducers: {
    clearCurrentNode(state) {
      state.currentNode = null;
    },
    clearCurrentLesson(state) {
      state.currentLesson = null;
    },
    clearCurrentQuiz(state) {
      state.currentQuiz = null;
    },
    clearCurrentQuestion(state) {
      state.currentQuestion = null;
    },
    clearStudioError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchAllCourses
      .addCase(fetchAllCourses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllCourses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allCourses = action.payload;
        state.allCoursesLoaded = true;
      })
      .addCase(fetchAllCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchMiniAppsForSubject
      .addCase(fetchMiniAppsForSubject.fulfilled, (state, action) => {
        state.subjectMiniApps = action.payload;
      })
      // createCourse
      .addCase(createCourse.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.isMutating = false;
        state.allCourses.push(action.payload);
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })
      // updateCourse
      .addCase(updateCourse.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.isMutating = false;
        const raw = action.payload;
        const idx = state.allCourses.findIndex((c) => c._id === raw._id);
        const ctx =
          idx >= 0
            ? state.allCourses[idx]
            : state.currentCourse && state.currentCourse._id === raw._id
              ? state.currentCourse
              : undefined;
        if (!ctx) return;
        const entry = toStudioCourseEntry(raw, ctx, {
          roadmapTitle: ctx.roadmapTitle,
          nodeCount: ctx.nodeCount,
        });
        if (idx >= 0) state.allCourses[idx] = entry;
        if (state.currentCourse?._id === raw._id) state.currentCourse = entry;
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })
      // deleteCourse
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.allCourses = state.allCourses.filter((c) => c._id !== action.payload);
        if (state.currentCourse?._id === action.payload) state.currentCourse = null;
      })
      // fetchCourseNodes
      .addCase(fetchCourseNodes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseNodes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmapNodes = action.payload;
      })
      .addCase(fetchCourseNodes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetchNodeDetail
      .addCase(fetchNodeDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNodeDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentNode = action.payload;
      })
      .addCase(fetchNodeDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // updateNode
      .addCase(updateNode.fulfilled, (state, action) => {
        if (state.currentNode) state.currentNode.node = action.payload;
      })
      // fetchLessonDetail / createLesson / updateLesson
      .addCase(fetchLessonDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLessonDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentLesson = action.payload;
      })
      .addCase(fetchLessonDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createLesson.fulfilled, (state, action) => {
        state.currentLesson = action.payload;
      })
      .addCase(updateLesson.fulfilled, (state, action) => {
        state.currentLesson = action.payload;
      })
      // fetchQuizDetail / createQuiz / updateQuiz / updateQuizQuestions
      .addCase(fetchQuizDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuizDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuiz = action.payload;
      })
      .addCase(fetchQuizDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createQuiz.fulfilled, (state, action) => {
        state.currentQuiz = action.payload;
      })
      .addCase(updateQuiz.fulfilled, (state, action) => {
        state.currentQuiz = action.payload;
      })
      .addCase(updateQuizQuestions.fulfilled, (state, action) => {
        state.currentQuiz = action.payload;
      })
      // searchCourseQuestions
      .addCase(searchCourseQuestions.fulfilled, (state, action) => {
        state.questionSearchResults = action.payload;
        for (const q of action.payload) state.questionCache[q._id] = q;
      })
      // fetchQuestionDetail
      .addCase(fetchQuestionDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuestionDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuestion = action.payload;
        state.questionCache[action.payload._id] = action.payload;
      })
      .addCase(fetchQuestionDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createQuestion.fulfilled, (state, action) => {
        state.currentQuestion = action.payload;
        state.questionCache[action.payload._id] = action.payload;
      })
      .addCase(updateQuestion.fulfilled, (state, action) => {
        state.currentQuestion = action.payload;
        state.questionCache[action.payload._id] = action.payload;
      })
      .addCase(deleteQuestion.fulfilled, (state, action) => {
        delete state.questionCache[action.payload];
        state.questionSearchResults = state.questionSearchResults.filter(
          (q) => q._id !== action.payload
        );
      });
  },
});

export const {
  clearCurrentNode,
  clearCurrentLesson,
  clearCurrentQuiz,
  clearCurrentQuestion,
  clearStudioError,
} = studioSlice.actions;

export default studioSlice.reducer;
