import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Star, Award, Loader2 } from 'lucide-react';
import apiClient from '../../apiClient';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function TherapistSelector({ onSelect }) {
  const [therapists, setTherapists] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/therapists')
      .then((res) => {
        if (!cancelled) setTherapists(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load therapists. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (therapist) => {
    setSelected(therapist);
    onSelect?.(therapist);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading therapists…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (therapists.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No therapists are currently accepting new patients.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Choose a therapist for your session</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {therapists.map((t) => {
          const initials = getInitials(t.full_name);
          const specialty = t.specializations?.[0] || 'General Therapy';
          const isSelected = selected?.user_id === t.user_id;

          return (
            <Card
              key={t.user_id}
              onClick={() => handleSelect(t)}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{t.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{t.years_experience} yrs experience</p>
                      </div>
                      <Badge variant="default" className="flex-shrink-0 text-xs">Available</Badge>
                    </div>
                    <p className="text-sm font-medium text-primary mt-1">{specialty}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {t.rating?.toFixed(1) ?? '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        {t.total_reviews} reviews
                      </span>
                      <span className="font-medium text-foreground">
                        PKR {t.hourly_rate?.toLocaleString()}/hr
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
