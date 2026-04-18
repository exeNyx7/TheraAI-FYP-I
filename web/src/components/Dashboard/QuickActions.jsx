import { Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { MessageCircle, Calendar, BookOpen, Trophy } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      <Link to="/chat" className="group">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-primary/70 h-full border-2 hover:scale-105 transform">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <MessageCircle className="h-7 w-7 text-primary group-hover:animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-base">Mindful Chat</p>
              <p className="text-xs text-muted-foreground">AI Support</p>
            </div>
          </div>
        </Card>
      </Link>

      <Link to="/appointments" className="group">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-orange-500/70 h-full border-2 hover:scale-105 transform">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <Calendar className="h-7 w-7 text-orange-500 group-hover:animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-base">Book Therapist</p>
              <p className="text-xs text-muted-foreground">Book Session</p>
            </div>
          </div>
        </Card>
      </Link>

      <Link to="/journal" className="group">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-blue-500/70 h-full border-2 hover:scale-105 transform">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <BookOpen className="h-7 w-7 text-blue-500 group-hover:animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-base">Diary</p>
              <p className="text-xs text-muted-foreground">Write & Reflect</p>
            </div>
          </div>
        </Card>
      </Link>

      <Link to="/assessments" className="group">
        <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-emerald-500/70 h-full border-2 hover:scale-105 transform">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
              <Trophy className="h-7 w-7 text-emerald-500 group-hover:animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-base">Assessments</p>
              <p className="text-xs text-muted-foreground">Gamified Tests</p>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}
