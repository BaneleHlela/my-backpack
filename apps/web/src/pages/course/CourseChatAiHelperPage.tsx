// AI Helper chat — 1:1 chat between the learner and an AI tutor, scoped to one course.
// Optimistic UI: the user's bubble appears immediately from local state (`pendingText`); once
// the server confirms (both messages persisted server-side, see aiChatSlice.ts's
// sendChatMessage), the pending bubble is cleared and the real pair renders from Redux instead.
// On failure the pending bubble stays with an inline "tap to retry" chip.
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, Loader2, Send, Sparkles } from 'lucide-react';
import type { AppDispatch, RootState } from '../../app/store';
import { fetchCourseBySlug } from '../../features/courses/coursesSlice';
import {
  fetchChatHistory,
  sendChatMessage,
  fetchPracticeQuestions,
  clearPracticeQuestions,
} from '../../features/aiChat/aiChatSlice';
import ChatBubble from '../../components/chat/ChatBubble';
import PracticeQuestionsCard from '../../components/chat/PracticeQuestionsCard';

// Static conversational starters — populate/send a normal chat message through the existing
// send flow, no dedicated endpoint. "Quiz me on this chapter" is handled separately below
// since it calls a different endpoint and renders an inline widget instead of a chat turn.
const CONVERSATION_STARTERS = ['Explain this differently', 'Give me an example', 'Can you summarize this?'];

export default function CourseChatAiHelperPage() {
  const { subjectSlug, courseSlug } = useParams<{ subjectSlug: string; courseSlug: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { enrolledSubjects } = useSelector((state: RootState) => state.enrollment);
  const { coursesByKey, currentCourse } = useSelector((state: RootState) => state.courses);
  const { activeProfile } = useSelector((state: RootState) => state.auth);
  const ageGroup = activeProfile?.ageGroup ?? 'adult';

  let fieldSlug = '';
  if (enrolledSubjects && subjectSlug) {
    for (const { field, subjects } of enrolledSubjects.fields) {
      if (subjects.some((s) => s.subject.slug === subjectSlug)) {
        fieldSlug = field.slug;
        break;
      }
    }
  }

  const courses =
    fieldSlug && subjectSlug ? (coursesByKey[`${fieldSlug}/${subjectSlug}`] ?? []) : [];
  const listCourse = courses.find((c) => c.slug === courseSlug);
  const course = listCourse ?? (currentCourse?.slug === courseSlug ? currentCourse : undefined);

  useEffect(() => {
    if (!fieldSlug || !subjectSlug || !courseSlug || listCourse) return;
    void dispatch(fetchCourseBySlug({ fieldSlug, subjectSlug, courseSlug }));
  }, [dispatch, fieldSlug, subjectSlug, courseSlug, listCourse]);

  const courseId = course?._id;
  const {
    messagesByCourseId,
    historyStatus,
    sendStatus,
    error,
    practiceQuestionsByCourseId,
    practiceQuestionsStatus,
    practiceQuestionsError,
  } = useSelector((state: RootState) => state.aiChat);
  const messages = courseId ? (messagesByCourseId[courseId] ?? []) : [];
  const practiceQuestions = courseId ? practiceQuestionsByCourseId[courseId] : undefined;
  const isSending = sendStatus === 'sending';
  const isGeneratingPractice = practiceQuestionsStatus === 'loading';

  const [inputText, setInputText] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courseId) void dispatch(fetchChatHistory(courseId));
  }, [dispatch, courseId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pendingText]);

  const sendText = (text: string) => {
    if (!courseId) return;
    setPendingText(text);
    dispatch(sendChatMessage({ courseId, message: text }))
      .unwrap()
      .then(() => setPendingText(null))
      .catch(() => {
        // Leave pendingText set — the bubble stays with a retry affordance.
      });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isSending || !courseId) return;
    setInputText('');
    sendText(text);
  };

  const handleRetry = () => {
    if (!pendingText || isSending) return;
    sendText(pendingText);
  };

  // Book-to-course pipeline, Phase 7 — suggested-action chips. "Quiz me" calls the
  // practice-questions endpoint directly (not sent as a chat message); the starters below just
  // populate/send a normal chat message through the existing send flow.
  const handleQuizMe = () => {
    if (!courseId || isGeneratingPractice) return;
    void dispatch(fetchPracticeQuestions(courseId));
  };

  const handleDismissPractice = () => {
    if (courseId) dispatch(clearPracticeQuestions(courseId));
  };

  const handleStarter = (text: string) => {
    if (isSending) return;
    sendText(text);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] max-w-2xl mx-auto w-full px-4 py-4">
      <button
        type="button"
        onClick={() => navigate(`/subject/${subjectSlug}/course/${courseSlug}/chat`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors flex-shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        {course?.name ?? 'Course Chat'}
      </button>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 bg-white/40 backdrop-blur rounded-3xl border border-white/50 p-4"
      >
        {historyStatus === 'loading' && messages.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : messages.length === 0 && !pendingText ? (
          <p className="text-center text-sm text-gray-500 py-10">
            Say hello! Ask the AI Helper anything about {course?.name ?? 'this course'}.
          </p>
        ) : null}

        {messages.map((m) => (
          <ChatBubble key={m._id} role={m.role} content={m.content} />
        ))}

        {isGeneratingPractice && (
          <p className="text-xs text-gray-500 px-1">Putting together a few practice questions…</p>
        )}
        {practiceQuestionsError && !isGeneratingPractice && (
          <p className="text-xs text-rose-600 px-1">{practiceQuestionsError}</p>
        )}
        {practiceQuestions && practiceQuestions.length > 0 && (
          <PracticeQuestionsCard questions={practiceQuestions} onDismiss={handleDismissPractice} />
        )}

        {pendingText && (
          <>
            <ChatBubble role="user" content={pendingText} pending={isSending} />
            {isSending && <p className="text-xs text-gray-500 px-1">AI Helper is typing…</p>}
            {!isSending && error && (
              <button
                type="button"
                onClick={handleRetry}
                className="self-end text-xs font-semibold text-rose-700 bg-rose-100 rounded-full px-3 py-1 hover:bg-rose-200 transition-colors"
              >
                {error} — click to retry
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleQuizMe}
          disabled={isGeneratingPractice || !courseId}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-100/80 text-teal-700 hover:bg-teal-200/80 disabled:opacity-60 transition-colors"
        >
          {isGeneratingPractice ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Quiz me on this chapter
        </button>
        {CONVERSATION_STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() => handleStarter(starter)}
            disabled={isSending}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/50 border border-white/60 text-gray-600 hover:bg-white/70 disabled:opacity-60 transition-colors"
          >
            {starter}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 mt-2 flex-shrink-0">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={ageGroup === 'child' ? 'Ask me anything!' : 'Ask a question…'}
          disabled={isSending}
          rows={1}
          className="flex-1 resize-none max-h-32 bg-white/40 backdrop-blur border border-white/50 rounded-2xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
