import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { User, Star, MessageCircle, Video, Award } from 'lucide-react';

const therapists = [
  {
    id: '1',
    name: 'Dr. Sarah Mitchell',
    specialty: 'Anxiety & Depression',
    rating: 4.9,
    sessions: 234,
    available: true,
    avatar: 'SM',
    degree: 'PhD Clinical Psychology',
  },
  {
    id: '2',
    name: 'Dr. James Chen',
    specialty: 'CBT & Trauma',
    rating: 4.8,
    sessions: 189,
    available: true,
    avatar: 'JC',
    degree: 'PsyD Psychology',
  },
  {
    id: '3',
    name: 'Dr. Aisha Rahman',
    specialty: 'Stress & Mindfulness',
    rating: 4.95,
    sessions: 312,
    available: false,
    avatar: 'AR',
    degree: 'PhD Clinical Psychology',
  },
  {
    id: '4',
    name: 'Dr. David Kim',
    specialty: 'Relationship Counseling',
    rating: 4.7,
    sessions: 156,
    available: true,
    avatar: 'DK',
    degree: 'LMFT Marriage & Family',
  },
];

export function TherapistSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (therapist) => {
    setSelected(therapist);
    onSelect?.(therapist);
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Choose a therapist for your session</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {therapists.map((t) => (
          <Card
            key={t.id}
            onClick={() => handleSelect(t)}
            className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${
              selected?.id === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            } ${!t.available ? 'opacity-60' : ''}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.degree}</p>
                    </div>
                    <Badge variant={t.available ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                      {t.available ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-primary mt-1">{t.specialty}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {t.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      {t.sessions} sessions
                    </span>
                  </div>
                  {t.available && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="text-xs gap-1 bg-transparent h-7 px-2">
                        <MessageCircle className="h-3.5 w-3.5" /> Message
                      </Button>
                      <Button size="sm" className="text-xs gap-1 h-7 px-2 bg-primary hover:bg-primary/90">
                        <Video className="h-3.5 w-3.5" /> Book
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
