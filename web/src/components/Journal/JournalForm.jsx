/**
 * JournalForm Component
 * Form for creating new journal entries with mood selection and AI analysis
 */

import React, { useState } from 'react';
import { PenLine, Sparkles, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import MoodSelector from './MoodSelector';
import { useToast } from '../../contexts/ToastContext';
import './JournalForm.css';

const JournalForm = ({ onSubmit, onCancel, initialData = null }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    mood: initialData?.mood || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const MIN_CONTENT_LENGTH = 10;
  const MAX_CONTENT_LENGTH = 5000;
  const MAX_TITLE_LENGTH = 200;

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = 'Journal content is required';
    } else if (formData.content.trim().length < MIN_CONTENT_LENGTH) {
      newErrors.content = `Content must be at least ${MIN_CONTENT_LENGTH} characters`;
    } else if (formData.content.length > MAX_CONTENT_LENGTH) {
      newErrors.content = `Content must not exceed ${MAX_CONTENT_LENGTH} characters`;
    }

    // Mood validation
    if (!formData.mood) {
      newErrors.mood = 'Please select a mood';
    }

    // Title validation (optional, but if provided must be valid)
    if (formData.title && formData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must not exceed ${MAX_TITLE_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submitData = {
        content: formData.content.trim(),
        mood: formData.mood,
        ...(formData.title.trim() && { title: formData.title.trim() }),
      };

      await onSubmit(submitData);

      // Reset form on success (only if not editing)
      if (!initialData) {
        setFormData({ title: '', content: '', mood: '' });
      }

      showToast(
        initialData 
          ? 'Journal entry updated successfully! AI is re-analyzing...' 
          : 'Journal entry created successfully! AI analysis complete.', 
        'success'
      );
    } catch (error) {
      console.error('Submit error:', error);
      showToast(error.message || 'Failed to save journal entry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Character count for content
  const contentLength = formData.content.length;
  const contentPercentage = (contentLength / MAX_CONTENT_LENGTH) * 100;

  return (
    <Card className="journal-form">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg">
              <PenLine size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {initialData ? 'Edit Journal Entry' : 'New Journal Entry'}
              </h2>
              <p className="text-sm text-gray-500">
                Share your thoughts and feelings
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-purple-600">
            <Sparkles size={16} />
            <span className="text-xs font-medium">AI-Powered</span>
          </div>
        </div>

        {/* Title Input */}
        <div>
          <Input
            type="text"
            placeholder="Give your entry a title (optional)"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={MAX_TITLE_LENGTH}
            error={errors.title}
            className="text-base"
          />
          {formData.title && (
            <p className="text-xs text-gray-500 mt-1">
              {formData.title.length}/{MAX_TITLE_LENGTH}
            </p>
          )}
        </div>

        {/* Mood Selector */}
        <div>
          <MoodSelector
            selectedMood={formData.mood}
            onMoodSelect={(mood) => handleChange('mood', mood)}
          />
          {errors.mood && (
            <p className="text-sm text-red-600 mt-2">{errors.mood}</p>
          )}
        </div>

        {/* Content Textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What's on your mind?
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="Write about your day, your feelings, or anything else you'd like to share..."
            rows={8}
            maxLength={MAX_CONTENT_LENGTH}
            className={`
              w-full px-4 py-3 rounded-lg border-2 
              ${errors.content ? 'border-red-300' : 'border-gray-200'}
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200
              resize-none transition-all duration-200
              placeholder-gray-400 text-gray-900
            `}
          />
          
          {/* Character Counter */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1">
              {errors.content && (
                <p className="text-sm text-red-600">{errors.content}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    contentPercentage > 90
                      ? 'bg-red-500'
                      : contentPercentage > 70
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(contentPercentage, 100)}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  contentLength < MIN_CONTENT_LENGTH
                    ? 'text-red-600'
                    : contentPercentage > 90
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {contentLength}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>
        </div>

        {/* AI Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Sparkles size={20} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">
                AI-Powered Emotional Support
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Our AI will analyze the sentiment of your entry and provide a personalized, 
                empathetic response to support your emotional well-being.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting || contentLength < MIN_CONTENT_LENGTH || !formData.mood}
            className="min-w-32"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {initialData ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                {initialData ? 'Update Entry' : 'Create Entry'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default JournalForm;
