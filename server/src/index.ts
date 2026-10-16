import type * as Party from "partykit/server";
import type { ClientMessage, ServerMessage, RoomState, Participant, FullRoomState, DeckType } from "@pointing-poker/shared/types";

type ConnectionState = { participantId?: string; kicked?: boolean };
const ROOM_STATE_KEY = "room-state";
const DECK_TYPES: DeckType[] = ["fibonacci", "modified-fibonacci", "tshirt", "powers-of-2", "custom"];
const STANDARD_DECKS: Record<Exclude<DeckType, "custom">, Array<string | number>> = {
  fibonacci: [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89],
  "modified-fibonacci": ["0", "½", "1", "2", "3", "5", "8", "13", "20", "40", "100"],
  tshirt: ["XS", "S", "M", "L", "XL", "XXL"],
  "powers-of-2": [0, 1, 2, 4, 8, 16, 32, 64],
};
const SPECIAL_CARDS = new Set(["☕", "❓", "♾️"]);

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= max ? text : null;
}
function isDeckType(value: unknown): value is DeckType {
  return typeof value === "string" && DECK_TYPES.includes(value as DeckType);
}
function isRole(value: unknown): value is "voter" | "spectator" {
  return value === "voter" || value === "spectator";
}
function isPersistentId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function isClientMessage(value: unknown): value is ClientMessage {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

export default class PointingPokerServer implements Party.Server {
  static options = { hibernate: false };
  private participants = new Map<string, Participant>();
  private connectionMap = new Map<string, string>();
  private reverseConnectionMap = new Map<string, Set<string>>();
  private previousParticipants = new Map<string, Participant>();
  private kickedParticipantIds = new Set<string>();
  private roomState: RoomState;

  constructor(readonly room: Party.Room) { this.roomState = this.defaultRoomState(); }

  async onStart() {
    const stored = await this.room.storage.get<RoomState>(ROOM_STATE_KEY);
    if (stored) this.roomState = stored;
    if (this.roomState.timerSeconds && this.roomState.timerStartedAt) {
      const endsAt = Date.parse(this.roomState.timerStartedAt) + this.roomState.timerSeconds * 1000;
      if (endsAt <= Date.now()) {
        this.roomState.timerSeconds = null;
        this.roomState.timerStartedAt = null;
        await this.persistRoomState();
      } else await this.room.storage.setAlarm(endsAt);
    }
  }

  async onAlarm() {
    this.roomState.timerSeconds = null;
    this.roomState.timerStartedAt = null;
    await this.persistRoomState();
    this.broadcast({ type: "timer-stopped" });
  }

  async onRequest(request: Party.Request): Promise<Response> {
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    const voters = [...this.participants.values()].filter((p) => p.role !== "spectator");
    const spectators = [...this.participants.values()].filter((p) => p.role === "spectator");
    const numericVotes = voters.filter((p) => p.vote !== null && !isNaN(parseFloat(String(p.vote)))).map((p) => parseFloat(String(p.vote)));
    const stats = numericVotes.length ? {
      average: Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 100) / 100,
      min: Math.min(...numericVotes), max: Math.max(...numericVotes), consensus: new Set(numericVotes).size === 1,
    } : { average: null, min: null, max: null, consensus: false };
    return Response.json({
      roomId: this.room.id, revealed: this.roomState.revealed,
      currentStory: this.roomState.currentStory, deckType: this.roomState.deckType,
      voters: voters.map((p) => ({ participantId: p.id, displayName: p.displayName, role: p.role, hasVoted: p.hasVoted, vote: this.roomState.revealed ? p.vote : p.hasVoted ? "hidden" : null })),
      spectators: spectators.map((p) => ({ participantId: p.id, displayName: p.displayName })),
      stats: this.roomState.revealed ? stats : null,
    }, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  async onConnect(connection: Party.Connection<ConnectionState>) {
    connection.send(JSON.stringify({ type: "state", state: this.getFullState(), yourId: connection.id } satisfies ServerMessage));
  }

  async onMessage(message: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection<ConnectionState>) {
    if (typeof message !== "string") return this.sendError(sender.id, "Only JSON text messages are supported");
    try {
      const parsed: unknown = JSON.parse(message);
      if (!isClientMessage(parsed)) throw new Error("Invalid message");
      const data = parsed as ClientMessage;
      switch (data.type) {
        case "join": await this.handleJoin(sender, data); break;
        case "vote": this.handleVote(sender.id, data.value); break;
        case "reveal": await this.handleReveal(sender.id); break;
        case "clear": await this.handleClear(sender.id); break;
        case "set-story": await this.handleSetStory(sender.id, data.title); break;
        case "set-deck": await this.handleSetDeck(sender.id, data.deckType, data.customValues); break;
        case "start-timer": await this.handleStartTimer(sender.id, data.seconds); break;
        case "stop-timer": await this.handleStopTimer(sender.id); break;
        case "set-teams": await this.handleSetTeams(sender.id, data.teams); break;
        case "kick": this.handleKick(sender.id, data.participantId); break;
        default: this.sendError(sender.id, "Unknown message type");
      }
    } catch { this.sendError(sender.id, "Failed to process message"); }
  }

  async onClose(connection: Party.Connection<ConnectionState>) {
    const participantId = this.connectionMap.get(connection.id) ?? connection.state?.participantId;
    this.connectionMap.delete(connection.id);
    if (!participantId) return;
    const connections = this.reverseConnectionMap.get(participantId);
    connections?.delete(connection.id);
    if (connections?.size) return;
    this.reverseConnectionMap.delete(participantId);
    const participant = this.participants.get(participantId);
    if (!participant) return;
    this.participants.delete(participantId);
    if (!this.kickedParticipantIds.delete(participantId)) this.previousParticipants.set(participantId, { ...participant });
    if (this.roomState.moderatorId === participantId) {
      const replacement = [...this.participants.values()][0];
      if (replacement) {
        replacement.role = "moderator";
        this.roomState.moderatorId = replacement.id;
        await this.persistRoomState();
        this.broadcast({ type: "moderator-changed", newModeratorId: replacement.id });
      }
    }
    this.broadcast({ type: "participant-left", id: participantId });
  }

  private async handleJoin(connection: Party.Connection<ConnectionState>, data: Extract<ClientMessage, { type: "join" }>) {
    const displayName = cleanText(data.displayName, 60);
    if (!displayName || !isRole(data.role)) return this.sendError(connection.id, "Invalid name or role");
    if (data.role === "spectator" && !this.roomState.settings.allowSpectators) return this.sendError(connection.id, "Spectators are not allowed");
    if (data.persistentId !== undefined && !isPersistentId(data.persistentId)) return this.sendError(connection.id, "Invalid participant identity");
    const cleanedTeam = data.team === undefined ? undefined : cleanText(data.team, 40);
    if (data.team !== undefined && !cleanedTeam) return this.sendError(connection.id, "Invalid team");
    const team = cleanedTeam ?? undefined;
    if (team && this.roomState.teamGroups?.length && !this.roomState.teamGroups.includes(team)) return this.sendError(connection.id, "Unknown team");

    const participantId = data.persistentId ?? connection.id;
    this.connectionMap.set(connection.id, participantId);
    const connections = this.reverseConnectionMap.get(participantId) ?? new Set<string>();
    connections.add(connection.id);
    this.reverseConnectionMap.set(participantId, connections);
    connection.setState({ participantId });
    const active = this.participants.get(participantId);
    if (active) {
      connection.send(JSON.stringify({ type: "state", state: this.getFullState(), yourId: participantId } satisfies ServerMessage));
      return;
    }

    const previous = this.previousParticipants.get(participantId);
    this.previousParticipants.delete(participantId);
    const first = this.participants.size === 0;
    const participant: Participant = previous ? { ...previous, displayName, team: team ?? previous.team } : {
      id: participantId, displayName, role: first ? "moderator" : data.role,
      vote: null, hasVoted: false, joinedAt: new Date().toISOString(), team,
    };
    if (first) {
      if (!previous) this.resetVotes();
      participant.role = "moderator";
      this.roomState.moderatorId = participantId;
      await this.persistRoomState();
    } else if (previous?.role === "moderator") {
      const current = this.participants.get(this.roomState.moderatorId);
      if (current) current.role = "voter";
      participant.role = "moderator";
      this.roomState.moderatorId = participantId;
      await this.persistRoomState();
    }
    this.participants.set(participantId, participant);
    this.broadcast({ type: "participant-joined", participant });
    if (participant.role === "moderator") this.broadcast({ type: "moderator-changed", newModeratorId: participantId });
    connection.send(JSON.stringify({ type: "state", state: this.getFullState(), yourId: participantId } satisfies ServerMessage));
  }

  private handleVote(connectionId: string, value: unknown) {
    const participant = this.getParticipant(connectionId);
    if (!participant || participant.role === "spectator") return this.sendError(connectionId, "Only voters can vote");
    if (this.roomState.revealed) return this.sendError(connectionId, "Start a new round before voting again");
    if (!this.isAllowedVote(value)) return this.sendError(connectionId, "That card is not in the current deck");
    participant.vote = value;
    participant.hasVoted = true;
    this.broadcast({ type: "vote-cast", id: participant.id });
    if (this.roomState.settings.autoRevealWhenAllVoted) {
      const voters = [...this.participants.values()].filter((p) => p.role !== "spectator");
      if (voters.length && voters.every((p) => p.hasVoted)) void this.revealVotes();
    }
  }

  private async handleReveal(id: string) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can reveal votes");
    await this.revealVotes();
  }
  private async handleClear(id: string) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can clear votes");
    await this.stopTimerInternal(); this.resetVotes(); this.broadcast({ type: "votes-cleared" });
  }
  private async handleSetStory(id: string, value: unknown) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can set story");
    if (typeof value !== "string" || value.length > 500) return this.sendError(id, "Story title is too long");
    await this.stopTimerInternal(); this.roomState.currentStory = value.trim(); this.resetVotes();
    await this.persistRoomState(); this.broadcast({ type: "story-updated", title: this.roomState.currentStory });
  }
  private async handleSetDeck(id: string, value: unknown, customValues?: unknown) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can set deck");
    if (!isDeckType(value)) return this.sendError(id, "Unknown deck type");
    const custom = this.validateCustomDeck(customValues);
    if ((value === "custom" || customValues !== undefined) && !custom) return this.sendError(id, "Invalid custom deck");
    this.roomState.deckType = value; this.roomState.customDeck = custom ?? undefined; this.resetVotes();
    await this.persistRoomState();
    this.broadcast({ type: "deck-updated", deckType: value, customValues: custom ?? undefined });
    this.broadcast({ type: "votes-cleared" });
  }
  private async handleStartTimer(id: string, value: unknown) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can start timer");
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 3600) return this.sendError(id, "Timer must be between 1 second and 1 hour");
    const seconds = value as number, startedAt = new Date().toISOString();
    this.roomState.timerSeconds = seconds; this.roomState.timerStartedAt = startedAt;
    await this.persistRoomState(); await this.room.storage.setAlarm(Date.now() + seconds * 1000);
    this.broadcast({ type: "timer-started", seconds, startedAt });
  }
  private async handleStopTimer(id: string) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can stop timer");
    await this.stopTimerInternal();
  }
  private async handleSetTeams(id: string, value: unknown) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can configure teams");
    if (!Array.isArray(value) || value.length > 12) return this.sendError(id, "Invalid teams");
    const teams = value.map((team) => cleanText(team, 40));
    if (teams.some((team) => !team) || new Set(teams).size !== teams.length) return this.sendError(id, "Team names must be unique");
    this.roomState.teamGroups = teams.length ? teams as string[] : undefined;
    await this.persistRoomState(); this.broadcast({ type: "teams-updated", teams: teams as string[] });
  }
  private handleKick(id: string, targetValue: unknown) {
    if (!this.isModerator(id)) return this.sendError(id, "Only moderator can kick participants");
    if (typeof targetValue !== "string" || targetValue === this.getParticipantId(id) || !this.participants.has(targetValue)) return this.sendError(id, "Invalid kick target");
    this.kickedParticipantIds.add(targetValue); this.previousParticipants.delete(targetValue);
    for (const connectionId of this.reverseConnectionMap.get(targetValue) ?? []) {
      const target = this.room.getConnection<ConnectionState>(connectionId);
      if (target) { target.setState({ participantId: targetValue, kicked: true }); target.send(JSON.stringify({ type: "kicked" } satisfies ServerMessage)); target.close(4001, "Kicked by moderator"); }
    }
  }

  private async stopTimerInternal() {
    const running = this.roomState.timerSeconds !== null || this.roomState.timerStartedAt !== null;
    await this.room.storage.deleteAlarm(); this.roomState.timerSeconds = null; this.roomState.timerStartedAt = null;
    if (running) { await this.persistRoomState(); this.broadcast({ type: "timer-stopped" }); }
  }
  private async revealVotes() {
    await this.stopTimerInternal(); this.roomState.revealed = true; await this.persistRoomState();
    this.broadcast({ type: "votes-revealed", votes: Object.fromEntries([...this.participants].map(([id, p]) => [id, p.vote])) });
  }
  private resetVotes() { for (const p of this.participants.values()) { p.vote = null; p.hasVoted = false; } this.roomState.revealed = false; }
  private isAllowedVote(value: unknown): value is string | number {
    if ((typeof value !== "string" && typeof value !== "number") || String(value).length > 24) return false;
    if (SPECIAL_CARDS.has(String(value))) return true;
    const cards = this.roomState.customDeck?.length ? this.roomState.customDeck : this.roomState.deckType === "custom" ? [] : STANDARD_DECKS[this.roomState.deckType];
    return cards.some((card) => String(card) === String(value));
  }
  private validateCustomDeck(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length < 2 || value.length > 40) return null;
    const cards = value.map((card) => cleanText(card, 24));
    return cards.some((card) => !card) || new Set(cards).size !== cards.length ? null : cards as string[];
  }
  private getParticipantId(id: string) { return this.connectionMap.get(id) ?? id; }
  private getParticipant(id: string) { return this.participants.get(this.getParticipantId(id)); }
  private isModerator(id: string) { return this.getParticipant(id)?.role === "moderator"; }
  private sendError(id: string, message: string) { this.room.getConnection(id)?.send(JSON.stringify({ type: "error", message } satisfies ServerMessage)); }
  private broadcast(message: ServerMessage) { this.room.broadcast(JSON.stringify(message)); }
  private async persistRoomState() { await this.room.storage.put(ROOM_STATE_KEY, this.roomState); }
  private getFullState(): FullRoomState { return { room: { ...this.roomState }, participants: Object.fromEntries(this.participants) }; }
  private defaultRoomState(): RoomState {
    return { sessionId: this.room.id, createdAt: new Date().toISOString(), moderatorId: "", deckType: "powers-of-2", currentStory: "", revealed: false, timerSeconds: null, timerStartedAt: null, settings: { allowSpectators: true, autoRevealWhenAllVoted: false, showAverage: true } };
  }
}
