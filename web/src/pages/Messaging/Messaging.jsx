import { TherapistSidebar } from '../../components/Dashboard/TherapistSidebar';
import { SidebarNav } from '../../components/Dashboard/SidebarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const mockThreads = [
  { id: '1', name: 'Dr. Amelia Reed', preview: 'Looking forward to our next session...', unread: 2, time: '10:32 AM' },
  { id: '2', name: 'Sarah Johnson', preview: 'Thank you for the worksheet.', unread: 0, time: 'Yesterday' },
  { id: '3', name: 'Michael Chen', preview: 'Can we reschedule Thursday?', unread: 1, time: 'Mon' },
];

export default function Messaging() {
  const { user } = useAuth();
  const isTherapistLike = ['therapist', 'psychiatrist', 'admin'].includes(user?.role);
  const Sidebar = isTherapistLike ? TherapistSidebar : SidebarNav;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ fontFamily: 'Montserrat' }}
            >
              Messaging
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Secure direct messaging between patients and their care team
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Montserrat' }}>
                  <MessageSquare className="h-5 w-5" /> Conversations
                </CardTitle>
                <CardDescription>Your recent threads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockThreads.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-all">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.preview}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-xs text-muted-foreground">{t.time}</p>
                      {t.unread > 0 && <Badge className="mt-1">{t.unread}</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 flex flex-col">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Montserrat' }}>Select a conversation</CardTitle>
                <CardDescription>Messages are end-to-end encrypted.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between min-h-[320px]">
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  No conversation selected
                </div>
                <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-muted/40">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent outline-none text-sm"
                    disabled
                  />
                  <Send className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              Coming soon — backend wiring in next phase
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
