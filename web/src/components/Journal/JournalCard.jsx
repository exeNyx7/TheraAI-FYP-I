/**
 * JournalCard Component
 * Displays a single journal entry with AI analysis, mood, and actions
 */

import React, { useState } from 'react';
import { 
  Smile, Frown, Heart, Zap, CloudRain, Angry, Wind, Meh,
  Calendar, Trash2, Edit, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import './JournalCard.css';

// Mood icon mapping
const MOOD_ICONS = {
  happy: { icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  sad: { icon: Frown, color: 'text-blue-500', bg: 'bg-blue-50' },
  anxious: { icon: CloudRain, color: 'text-purple-500', bg: 'bg-purple-50' },
  angry: { icon: Angry, color: 'text-red-500', bg: 'bg-red-50' },
  calm: { icon: Heart, color: 'text-green-500', bg: 'bg-green-50' },
  excited: { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
  stressed: { icon: Wind, color: 'text-gray-600', bg: 'bg-gray-50' },
  neutral: { icon: Meh, color: 'text-gray-400', bg: 'bg-gray-50' },
};

// Sentiment badge styling
const SENTIMENT_STYLES = {
  positive: { variant: 'success', label: 'Positive' },
  negative: { variant: 'error', label: 'Negative' },
  neutral: { variant: 'default', label: 'Neutral' },
};

const JournalCard = ({ journal, onDelete, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  // Truncate content for preview
  const truncateContent = (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const moodConfig = MOOD_ICONS[journal.mood] || MOOD_ICONS.neutral;
  const MoodIcon = moodConfig.icon;
  const sentimentStyle = SENTIMENT_STYLES[journal.sentiment_label] || SENTIMENT_STYLES.neutral;

  const shouldTruncate = journal.content.length > 200;
  const displayContent = shouldTruncate && !showFullContent 
    ? truncateContent(journal.content) 
    : journal.content;

  return (
    <Card className="journal-card group hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-3 flex-1">
          {/* Mood Icon */}
          <div className={`${moodConfig.bg} p-2.5 rounded-lg`}>
            <MoodIcon size={24} className={moodConfig.color} strokeWidth={2} />
          </div>

          {/* Title and Date */}
          <div className="flex-1 min-w-0">
            {journal.title && (
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {journal.title}
              </h3>
            )}
            <div className="flex items-center text-sm text-gray-500 mt-0.5">
              <Calendar size={14} className="mr-1.5" />
              <span>{formatDate(journal.created_at)}</span>
              <span className="mx-2">•</span>
              <span className="capitalize">{journal.mood}</span>
            </div>
          </div>

          {/* Sentiment Badge */}
          <Badge variant={sentimentStyle.variant} size="sm">
            {sentimentStyle.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Journal Text */}
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </p>
          
          {shouldTruncate && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2 flex items-center transition-colors"
            >
              {showFullContent ? (
                <>
                  Show less <ChevronUp size={16} className="ml-1" />
                </>
              ) : (
                <>
                  Read more <ChevronDown size={16} className="ml-1" />
                </>
              )}
            </button>
          )}
        </div>

        {/* AI Empathy Response */}
        {journal.empathy_response && (
          <div 
            className={`
              bg-gradient-to-r from-blue-50 to-purple-50 
              border border-blue-100 rounded-lg p-4
              transition-all duration-200
              ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 p-0 border-0 overflow-hidden'}
            `}
          >
            <div className="flex items-start space-x-2">
              <Sparkles size={18} className="text-purple-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">AI Insight</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {journal.empathy_response}
                </p>
                {journal.sentiment_score && (
                  <p className="text-xs text-gray-500 mt-2">
                    Confidence: {(journal.sentiment_score * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
          <Sparkles size={16} className="mr-1.5" />
          {isExpanded ? 'Hide' : 'Show'} AI Insight
        </Button>

        <div className="flex items-center space-x-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(journal)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit size={16} className="mr-1.5" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(journal.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} className="mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default JournalCard;
