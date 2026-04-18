import React, { useState } from 'react';
import { AppSidebar } from '../../components/Dashboard/AppSidebar';
import {
  Phone, ExternalLink, BookOpen, Brain, Heart,
  Shield, Sparkles, Layers, Search, AlertTriangle,
} from 'lucide-react';

// ── Crisis contacts ──────────────────────────────────────────────────────────
const CRISIS = [
  { name: 'Umang Helpline (Pakistan)', number: '0317-4288665', hours: '24/7', color: 'bg-red-500' },
  { name: 'Rozan Counselling (Pakistan)', number: '051-2890505', hours: 'Mon–Sat 9am–5pm', color: 'bg-orange-500' },
  { name: '988 Suicide & Crisis Lifeline (US)', number: '988', hours: '24/7', color: 'bg-purple-600' },
  { name: 'Crisis Text Line (US/UK)', number: 'Text HOME to 741741', hours: '24/7', color: 'bg-blue-600' },
];

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',       label: 'All',            icon: Layers },
  { id: 'crisis',    label: 'Crisis Support', icon: Shield },
  { id: 'anxiety',   label: 'Anxiety',        icon: Brain },
  { id: 'depression',label: 'Depression',     icon: Heart },
  { id: 'mindfulness',label:'Mindfulness',    icon: Sparkles },
  { id: 'cbt',       label: 'CBT Techniques', icon: BookOpen },
];

// ── Resource cards ───────────────────────────────────────────────────────────
const RESOURCES = [
  // Crisis
  {
    id: 1, category: 'crisis',
    title: 'International Association for Suicide Prevention',
    org: 'IASP',
    description: 'Global directory of crisis centres and prevention resources, available in dozens of countries.',
    url: 'https://www.iasp.info/resources/Crisis_Centres/',
    type: 'Directory',
  },
  {
    id: 2, category: 'crisis',
    title: 'Befrienders Worldwide',
    org: 'Befrienders',
    description: 'Emotional support for anyone in distress. Find a volunteer-run centre near you.',
    url: 'https://www.befrienders.org',
    type: 'Support',
  },
  // Anxiety
  {
    id: 3, category: 'anxiety',
    title: 'Anxiety & Depression Association of America',
    org: 'ADAA',
    description: 'Research-backed articles, therapist finder, and self-help tools for anxiety disorders.',
    url: 'https://adaa.org',
    type: 'Organisation',
  },
  {
    id: 4, category: 'anxiety',
    title: 'MindShift CBT',
    org: 'Anxiety Canada',
    description: 'Free CBT-based app for managing anxiety — worry, perfectionism, social anxiety, and more.',
    url: 'https://www.anxietycanada.com/resources/mindshift-cbt/',
    type: 'App',
  },
  {
    id: 5, category: 'anxiety',
    title: 'NHS: Anxiety, fear and panic',
    org: 'NHS UK',
    description: 'Clear, trusted guidance on recognising symptoms and taking first steps to feel better.',
    url: 'https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/feelings-and-symptoms/anxiety-fear-panic/',
    type: 'Guide',
  },
  // Depression
  {
    id: 6, category: 'depression',
    title: 'National Institute of Mental Health — Depression',
    org: 'NIMH',
    description: 'Authoritative overview of depression: symptoms, causes, treatments, and clinical trials.',
    url: 'https://www.nimh.nih.gov/health/topics/depression',
    type: 'Organisation',
  },
  {
    id: 7, category: 'depression',
    title: 'Mind: Depression',
    org: 'Mind UK',
    description: 'Plain-language guide covering types, treatments, self-care, and how to support someone else.',
    url: 'https://www.mind.org.uk/information-support/types-of-mental-health-problems/depression/',
    type: 'Guide',
  },
  {
    id: 8, category: 'depression',
    title: 'Moodfit',
    org: 'Moodfit',
    description: 'Science-based mood-tracking and CBT tools to understand and improve low mood daily.',
    url: 'https://www.getmoodfit.com',
    type: 'App',
  },
  // Mindfulness
  {
    id: 9, category: 'mindfulness',
    title: 'Headspace — Basics',
    org: 'Headspace',
    description: 'Free guided meditation starter pack. Build a daily mindfulness habit in 10 minutes.',
    url: 'https://www.headspace.com/meditation/meditation-for-beginners',
    type: 'App',
  },
  {
    id: 10, category: 'mindfulness',
    title: 'UCLA Mindful Meditations',
    org: 'UCLA Health',
    description: 'Free audio and video meditations from UCLA\'s Mindful Awareness Research Center.',
    url: 'https://www.uclahealth.org/programs/marc/free-guided-meditations',
    type: 'Free Audio',
  },
  {
    id: 11, category: 'mindfulness',
    title: 'Smiling Mind',
    org: 'Smiling Mind',
    description: 'Completely free mindfulness app for all ages — popular in schools and workplaces.',
    url: 'https://www.smilingmind.com.au',
    type: 'App',
  },
  // CBT
  {
    id: 12, category: 'cbt',
    title: 'Beck Institute — CBT Resources',
    org: 'Beck Institute',
    description: 'Articles, videos, and worksheets from the home of Cognitive Behavioral Therapy.',
    url: 'https://beckinstitute.org/get-informed/cbt-resources/',
    type: 'Worksheets',
  },
  {
    id: 13, category: 'cbt',
    title: 'Therapist Aid — CBT Worksheets',
    org: 'Therapist Aid',
    description: 'Printable thought records, behavioural activation sheets, and coping-skills worksheets.',
    url: 'https://www.therapistaid.com/therapy-worksheets/cbt',
    type: 'Worksheets',
  },
  {
    id: 14, category: 'cbt',
    title: 'Woebot — CBT Chatbot',
    org: 'Woebot Health',
    description: 'AI-guided CBT conversations to challenge negative thoughts and build coping tools.',
    url: 'https://woebothealth.com',
    type: 'App',
  },
];

const TYPE_COLORS = {
  App:         'bg-violet-100 text-violet-700',
  Organisation:'bg-blue-100 text-blue-700',
  Guide:       'bg-green-100 text-green-700',
  Directory:   'bg-amber-100 text-amber-700',
  Worksheets:  'bg-pink-100 text-pink-700',
  Support:     'bg-orange-100 text-orange-700',
  'Free Audio':'bg-teal-100 text-teal-700',
};

// ── Components ───────────────────────────────────────────────────────────────
function CrisisCard({ item }) {
  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`h-10 w-10 rounded-full ${item.color} flex items-center justify-center flex-shrink-0`}>
        <Phone className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.hours}</p>
      </div>
      <a
        href={`tel:${item.number.replace(/\s/g, '')}`}
        className="flex-shrink-0 text-sm font-bold text-primary hover:underline"
      >
        {item.number}
      </a>
    </div>
  );
}

function ResourceCard({ resource }) {
  const typeCls = TYPE_COLORS[resource.type] || 'bg-muted text-muted-foreground';
  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{resource.org}</p>
          <h3 className="text-sm font-semibold leading-snug">{resource.title}</h3>
        </div>
        <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${typeCls}`}>
          {resource.type}
        </span>
      </div>
      <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{resource.description}</p>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
      >
        Visit resource <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = RESOURCES.filter((r) => {
    const matchCat = activeCategory === 'all' || r.category === activeCategory;
    const q = query.toLowerCase();
    const matchQ = !q || r.title.toLowerCase().includes(q) || r.org.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Montserrat' }}>Mental Health Resources</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Curated guides, apps, and organisations to support your wellbeing journey.
          </p>
        </div>

        {/* Crisis banner */}
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              In crisis? Reach out immediately — you don't have to face this alone.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CRISIS.map((c) => (
              <CrisisCard key={c.name} item={c} />
            ))}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search resources…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  activeCategory === id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Resource grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No resources match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
