import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronRight, Clock, BarChart3, Brain, Heart, Zap, Wind, Star } from 'lucide-react';

const assessments = [
  {
    id: 'phq9',
    name: 'Depression Screening (PHQ-9)',
    description: 'Standard depression screening questionnaire used in clinical settings.',
    category: 'Clinical',
    estimatedTime: '5-7 min',
    questions: 9,
    icon: Brain,
    color: 'text-blue-500 bg-blue-500/10',
  },
  {
    id: 'gad7',
    name: 'Anxiety Assessment (GAD-7)',
    description: 'Screens for generalized anxiety disorder severity.',
    category: 'Clinical',
    estimatedTime: '3-5 min',
    questions: 7,
    icon: Heart,
    color: 'text-red-500 bg-red-500/10',
  },
  {
    id: 'stress',
    name: 'Stress Level Assessment',
    description: 'Measures current stress levels and coping ability.',
    category: 'Wellness',
    estimatedTime: '5-8 min',
    questions: 14,
    icon: Zap,
    color: 'text-yellow-500 bg-yellow-500/10',
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness Questionnaire',
    description: 'Evaluates your present-moment awareness and mindfulness practices.',
    category: 'Wellness',
    estimatedTime: '4-6 min',
    questions: 12,
    icon: Wind,
    color: 'text-teal-500 bg-teal-500/10',
  },
  {
    id: 'resilience',
    name: 'Resilience Scale',
    description: 'Assesses your capacity to bounce back from adversity.',
    category: 'Strengths',
    estimatedTime: '6-8 min',
    questions: 17,
    icon: Star,
    color: 'text-purple-500 bg-purple-500/10',
  },
];

const categoryColors = {
  Clinical: 'bg-blue-100 text-blue-700',
  Wellness: 'bg-green-100 text-green-700',
  Strengths: 'bg-purple-100 text-purple-700',
};

export function AssessmentSelector({ onSelect }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Clinical', 'Wellness', 'Strengths'];

  const filtered = selectedCategory === 'All'
    ? assessments
    : assessments.filter(a => a.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Assessment grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((assessment) => {
          const Icon = assessment.icon;
          return (
            <Card
              key={assessment.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 border-2 hover:border-primary/30"
              onClick={() => onSelect?.(assessment)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${assessment.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge className={categoryColors[assessment.category] || 'bg-gray-100 text-gray-700'}>
                    {assessment.category}
                  </Badge>
                </div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {assessment.name}
                </CardTitle>
                <CardDescription className="text-sm">{assessment.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {assessment.estimatedTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {assessment.questions} questions
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1 text-primary hover:text-primary group-hover:bg-primary/10">
                    Start <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
