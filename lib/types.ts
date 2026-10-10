export const NOTE_TYPES = ['Company', 'Product', 'Price', 'Campaign', 'Event', 'Source'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];
export type ClaimStatus = 'verified' | 'conflicting' | 'stale';

export interface Claim {
  id: string;
  note_id: string;
  text: string;
  source_id: string;
  evidence_snippet: string;
  status: ClaimStatus;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  company: string;
  body_md: string;
  created_at: string;
  updated_at: string;
  last_verified_at: string;
  claims: Claim[];
  links: { to: string; relation: string }[];
  // Source notes only
  url?: string;
  source_type?: string;
  published_date?: string;
  fetched_at?: string;
  has_cache?: boolean;
}

/** One sentence of an answer or report. `cites` holds claim ids. */
export interface Sentence {
  text: string;
  cites: string[];
  inference?: boolean;
}

export interface Answer {
  title: string;
  lead: Sentence;
  sections: { heading?: string; sentences: Sentence[] }[];
  not_found: string[];
}

export type TaskStatus = 'planned' | 'running' | 'done' | 'failed';
export interface Task {
  id: string;
  title: string;
  query: string;
  company?: string;
  note_type?: string;
  status: TaskStatus;
  detail?: string;
}

export interface Run {
  id: string;
  question: string;
  mode: 'answer' | 'report';
  created_at: string;
  example?: boolean;
  tasks: Task[];
  answer: Answer | null;
  new_note_ids: string[];
  error?: string;
}

export type AgentEvent =
  | { type: 'run'; run_id: string }
  | { type: 'step'; label: string }
  | { type: 'tasks'; tasks: Task[] }
  | { type: 'notes'; ids: string[] }
  | { type: 'answer'; run: Run }
  | { type: 'error'; message: string };
