import Anthropic from "@anthropic-ai/sdk";

const SESSION_TTL_MS = 30 * 60 * 1000;

interface Session {
  messages:     Anthropic.MessageParam[];
  lastActivity: number;
}

const sessions = new Map<string, Session>();

function getOrCreate(userId: string): Session {
  const existing = sessions.get(userId);
  if (existing && Date.now() - existing.lastActivity <= SESSION_TTL_MS) {
    return existing;
  }
  const fresh: Session = { messages: [], lastActivity: Date.now() };
  sessions.set(userId, fresh);
  return fresh;
}

export function getSession(userId: string): Anthropic.MessageParam[] {
  return getOrCreate(userId).messages;
}

export function updateSession(userId: string, messages: Anthropic.MessageParam[]): void {
  const session = getOrCreate(userId);
  session.messages     = messages;
  session.lastActivity = Date.now();
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
}

setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(userId);
    }
  }
}, 10 * 60 * 1000);
