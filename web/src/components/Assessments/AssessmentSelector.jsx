import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronRight, Clock, BarChart3, Brain, Heart, Zap, Wind, Star, Loader2 } from 'lucide-react';
import apiClient from '../../apiClient';

const categoryIcons = {
  clinical: Brain,
  wellness: Wind,
};

const categoryColors = {
  clinical: 'text-blue-500 bg-blue-500/10',
  wellness: 'text-green-500 bg-green-500/10',
};

const categoryLabels = {
  clinical: 'Clinical',
  wellness: 'Wellness',
};

const categoryBgColors = {
  clinical: 'bg-blue-100 text-blue-700',
  wellness: 'bg-green-100 text-green-700',
};

export function AssessmentSelector({ onSelect }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/assessments');
      setAssessments(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setError('Failed to load assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Clinical', 'Wellness'];

  const filtered = selectedCategory === 'All'
    ? assessments
    : assessments.filter(a => categoryLabels[a.category] === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={fetchAssessments}>Try Again</Button>
      </div>
    );
  }

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
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No assessments available for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((assessment) => {
            const Icon = categoryIcons[assessment.category] || Brain;
            const colorClass = categoryColors[assessment.category] || 'text-gray-500 bg-gray-500/10';
            const badgeClass = categoryBgColors[assessment.category] || 'bg-gray-100 text-gray-700';

            return (
              <Card
                key={assessment.id || assessment.slug}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:-translate-y-1 border-2 hover:border-primary/30"
                onClick={() => onSelect?.(assessment)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge className={badgeClass}>
                      {categoryLabels[assessment.category]}
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
                        {assessment.estimated_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3.5 w-3.5" />
                        {assessment.question_count || 0} questions
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
      )}
    </div>
  );
}
