// A single message bubble in the AI Helper chat — aligned left (assistant) or right (user).
import type { AiChatRole } from '@my-backpack/shared';

interface ChatBubbleProps {
  role: AiChatRole;
  content: string;
  pending?: boolean;
}

export default function ChatBubble({ role, content, pending = false }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-800 ${
          isUser
            ? 'bg-white/60 backdrop-blur border border-white/60'
            : 'bg-white/30 backdrop-blur border border-white/40'
        } ${pending ? 'opacity-60' : ''}`}
      >
        {content}
      </div>
    </div>
  );
}
