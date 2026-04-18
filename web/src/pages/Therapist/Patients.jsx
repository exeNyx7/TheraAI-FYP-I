import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, Search, ChevronRight } from 'lucide-react';
import apiClient from '../../apiClient';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.get('/therapist/patients')
      .then(r => { if (!cancelled) setPatients(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setPatients([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? patients.filter(p => (p.name || p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q))
    : patients;

  return (
    <div className="flex min-h-screen bg-background">
      <TherapistSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'Montserrat' }}
            >
              My Patients
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Your active patient roster and care history</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                <Users className="h-5 w-5" /> Patient Roster
              </CardTitle>
              <CardDescription>Browse, search, and open individual patient records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/40">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {loading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">No patients found.</p>
              )}
              <div className="space-y-3">
                {!loading && filtered.map((p) => (
                  <Link
                    key={p.id || p._id || p.email}
                    to={`/patients/${p.id || p._id}`}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-sm hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center text-primary font-bold">
                        {(p.name || p.full_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{p.name || p.full_name || 'Unknown Patient'}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.email}{p.last_appointment ? ` · Last session ${p.last_appointment}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={(p.status === 'critical' || Number(p.unacknowledged_alerts ?? 0) > 0) ? 'destructive' : p.status === 'active' ? 'secondary' : 'outline'}>
                        {p.status || (Number(p.unacknowledged_alerts ?? 0) > 0 ? 'critical' : 'active')}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
