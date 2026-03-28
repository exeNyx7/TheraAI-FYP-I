import { cn } from '../../lib/utils';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-end gap-3 animate-fade-in', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-gradient-to-br from-primary/40 to-primary/20 text-primary'
      )}>
        {isUser ? 'Y' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-br-sm'
          : 'bg-muted text-foreground border border-border rounded-bl-sm'
      )}>
        {message.content}
      </div>
    </div>
  );
}
