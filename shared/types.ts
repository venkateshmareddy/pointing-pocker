// Deck types
export type DeckType = "fibonacci" | "modified-fibonacci" | "tshirt" | "powers-of-2" | "custom";

export interface RoomSettings {
  allowSpectators: boolean;
  autoRevealWhenAllVoted: boolean;
  showAverage: boolean;
}

export interface RoomState {
  sessionId: string;
  createdAt: string;
  moderatorId: string;
  deckType: DeckType;
  customDeck?: string[];
  currentStory: string;
  revealed: boolean;
  timerSeconds: number | null;
  timerStartedAt: string | null;
  teamGroups?: string[];
  settings: RoomSettings;
}

export interface Participant {
  id: string;
  displayName: string;
  role: "moderator" | "voter" | "spectator";
  vote: string | number | null;
  hasVoted: boolean;
  joinedAt: string;
  team?: string;
}

export interface FullRoomState {
  room: RoomState;
  participants: Record<string, Participant>;
}

// Client → Server messages
export type ClientMessage =
  | { type: "join"; displayName: string; role: "voter" | "spectator"; persistentId?: string; team?: string }
  | { type: "set-teams"; teams: string[] }
  | { type: "vote"; value: string | number }
  | { type: "reveal" }
  | { type: "clear" }
  | { type: "set-story"; title: string }
  | { type: "set-deck"; deckType: DeckType; customValues?: string[] }
  | { type: "start-timer"; seconds: number }
  | { type: "stop-timer" }
  | { type: "kick"; participantId: string };

// Server → Client messages
export type ServerMessage =
  | { type: "state"; state: FullRoomState; yourId: string }
  | { type: "participant-joined"; participant: Participant }
  | { type: "participant-left"; id: string }
  | { type: "vote-cast"; id: string }
  | { type: "votes-revealed"; votes: Record<string, string | number | null> }
  | { type: "votes-cleared" }
  | { type: "story-updated"; title: string }
  | { type: "deck-updated"; deckType: DeckType; customValues?: string[] }
  | { type: "timer-started"; seconds: number; startedAt: string }
  | { type: "timer-stopped" }
  | { type: "teams-updated"; teams: string[] }
  | { type: "moderator-changed"; newModeratorId: string }
  | { type: "kicked" }
  | { type: "error"; message: string };
