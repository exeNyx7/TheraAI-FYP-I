import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Star, Award, Video } from 'lucide-react';
import apiClient from '../../apiClient';
import { useAuth } from '../../contexts/AuthContext';

export default function BrowseTherapists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/therapists');
        if (!cancelled) setTherapists(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        if (!cancelled) setError('Failed to load therapists.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (!user) return null;

  const initials = (name) => (name || '?').split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex">
      <SidebarNav />
      <main className="flex-1 pt-16 md:pt-0">
        <div className="bg-background min-h-screen">
          <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Find a Therapist</h1>
              <p className="text-muted-foreground mt-2">Browse our verified therapists and book a session</p>
            </div>

            {loading && <p className="text-muted-foreground">Loading therapists...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && therapists.length === 0 && !error && (
              <div className="text-center py-16 text-muted-foreground">
                <p>No therapists available right now. Please check back later.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {therapists.map((t) => (
                <Card key={t.id} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-2 border-border hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                        {t.photo_url ? (
                          <img src={t.photo_url} alt={t.name} className="h-14 w-14 rounded-full object-cover" />
                        ) : initials(t.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{t.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                        {Array.isArray(t.specialties) && t.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.specialties.slice(0, 3).map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {t.bio && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{t.bio}</p>}
                    <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {t.rating || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" />
                        PKR {t.hourly_rate || 3000}/hr
                      </span>
                    </div>
                    <Button
                      onClick={() => navigate(`/book/${t.id}`)}
                      className="w-full mt-4 gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Video className="h-4 w-4" /> Book Session
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
