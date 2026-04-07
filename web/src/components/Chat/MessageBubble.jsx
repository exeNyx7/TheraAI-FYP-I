import { cn } from '../../lib/utils';

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', color: 'text-green-500 bg-green-500/10' },
  very_positive: { label: 'Very Positive', color: 'text-green-600 bg-green-600/10' },
  negative: { label: 'Low', color: 'text-orange-500 bg-orange-500/10' },
  very_negative: { label: 'Very Low', color: 'text-red-500 bg-red-500/10' },
  neutral: { label: 'Neutral', color: 'text-muted-foreground bg-muted' },
};

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const sentiment = !isUser && message.sentiment
    ? (SENTIMENT_CONFIG[message.sentiment] || SENTIMENT_CONFIG.neutral)
    : null;

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

      {/* Bubble + sentiment badge */}
      <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground border border-border rounded-bl-sm'
        )}>
          {message.content}
        </div>

        {sentiment && (
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', sentiment.color)}>
            {sentiment.label}
          </span>
        )}
      </div>
    </div>
  );
}
