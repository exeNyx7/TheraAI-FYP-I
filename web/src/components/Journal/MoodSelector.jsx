/**
 * MoodSelector Component
 * Interactive mood selection with icons and animations
 */

import React, { useState } from 'react';
import { Smile, Frown, Heart, Zap, CloudRain, Angry, Wind, Meh } from 'lucide-react';
import './MoodSelector.css';

// Mood configuration with icons and colors
const MOODS = [
  { 
    value: 'happy', 
    label: 'Happy', 
    icon: Smile, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    hoverColor: 'hover:bg-yellow-100',
    borderColor: 'border-yellow-500'
  },
  { 
    value: 'sad', 
    label: 'Sad', 
    icon: Frown, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
    borderColor: 'border-blue-500'
  },
  { 
    value: 'anxious', 
    label: 'Anxious', 
    icon: CloudRain, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-100',
    borderColor: 'border-purple-500'
  },
  { 
    value: 'angry', 
    label: 'Angry', 
    icon: Angry, 
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
    borderColor: 'border-red-500'
  },
  { 
    value: 'calm', 
    label: 'Calm', 
    icon: Heart, 
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    borderColor: 'border-green-500'
  },
  { 
    value: 'excited', 
    label: 'Excited', 
    icon: Zap, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    hoverColor: 'hover:bg-orange-100',
    borderColor: 'border-orange-500'
  },
  { 
    value: 'stressed', 
    label: 'Stressed', 
    icon: Wind, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
    borderColor: 'border-gray-600'
  },
  { 
    value: 'neutral', 
    label: 'Neutral', 
    icon: Meh, 
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
    borderColor: 'border-gray-400'
  },
];

const MoodSelector = ({ selectedMood, onMoodSelect, size = 'md', showLabel = true }) => {
  const [hoveredMood, setHoveredMood] = useState(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 20,
    md: 28,
    lg: 36,
  };

  return (
    <div className="mood-selector">
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How are you feeling today?
        </label>
      )}
      
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          const isSelected = selectedMood === mood.value;
          const isHovered = hoveredMood === mood.value;

          return (
            <button
              key={mood.value}
              type="button"
              onClick={() => onMoodSelect(mood.value)}
              onMouseEnter={() => setHoveredMood(mood.value)}
              onMouseLeave={() => setHoveredMood(null)}
              className={`
                mood-option
                ${sizeClasses[size]}
                flex flex-col items-center justify-center
                rounded-xl border-2 transition-all duration-200
                ${isSelected 
                  ? `${mood.bgColor} ${mood.borderColor} shadow-md scale-105` 
                  : `bg-white border-gray-200 ${mood.hoverColor}`
                }
                ${isHovered && !isSelected ? 'scale-105 shadow-sm' : ''}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                cursor-pointer
              `}
              aria-label={`Select ${mood.label} mood`}
              aria-pressed={isSelected}
            >
              <Icon 
                size={iconSizes[size]} 
                className={`${mood.color} transition-transform duration-200 ${isHovered || isSelected ? 'scale-110' : ''}`}
                strokeWidth={isSelected ? 2.5 : 2}
              />
              <span 
                className={`
                  mt-1 text-xs font-medium
                  ${isSelected ? mood.color : 'text-gray-600'}
                  transition-colors duration-200
                `}
              >
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected mood display for screen readers */}
      {selectedMood && (
        <div className="sr-only" role="status" aria-live="polite">
          Selected mood: {MOODS.find(m => m.value === selectedMood)?.label}
        </div>
      )}
    </div>
  );
};

export default MoodSelector;
