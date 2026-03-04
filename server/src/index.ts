import type * as Party from "partykit/server";
import type {
  ClientMessage,
  ServerMessage,
  RoomState,
  Participant,
  FullRoomState,
  DeckType,
} from "@pointing-poker/shared/types";

export default class PointingPokerServer implements Party.Server {
  static options = { hibernate: true };

  private participants: Map<string, Participant> = new Map();
  private roomState: RoomState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Maps connectionId (WebSocket) ↔ participantId (stable persistentId or fallback connectionId)
  private connectionMap: Map<string, string> = new Map(); // connectionId → participantId
  private reverseConnectionMap: Map<string, string> = new Map(); // participantId → connectionId

  // Participants who disconnected — kept for reconnect restoration
  private previousParticipants: Map<string, Participant> = new Map();

  constructor(readonly room: Party.Room) {
    this.roomState = {
      sessionId: room.id,
      createdAt: new Date().toISOString(),
      moderatorId: "",
      deckType: "fibonacci",
      currentStory: "",
      revealed: false,
      timerSeconds: null,
      timerStartedAt: null,
      settings: {
        allowSpectators: true,
        autoRevealWhenAllVoted: false,
        showAverage: true,
      },
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getParticipantId(connectionId: string): string {
    return this.connectionMap.get(connectionId) ?? connectionId;
  }

  private getConnectionForParticipant(participantId: string): Party.Connection | null {
    const connectionId = this.reverseConnectionMap.get(participantId);
    if (!connectionId) return null;
    return this.room.getConnection(connectionId) ?? null;
  }

  private sendError(connectionId: string, message: string) {
    const connection = this.room.getConnection(connectionId);
    if (connection) {
      const msg: ServerMessage = { type: "error", message };
      connection.send(JSON.stringify(msg));
    }
  }

  // ── HTTP API ───────────────────────────────────────────────────────────────

  async onRequest(request: Party.Request): Promise<Response> {
    // Only allow GET
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const voters = Array.from(this.participants.values()).filter(
      (p) => p.role !== "spectator"
    );
    const spectators = Array.from(this.participants.values()).filter(
      (p) => p.role === "spectator"
    );

    // Compute basic stats from numeric votes
    const numericVotes = voters
      .filter((p) => p.vote !== null && !isNaN(parseFloat(String(p.vote))))
      .map((p) => parseFloat(String(p.vote)));

    let stats: Record<string, number | boolean | null> = {
      average: null,
      min: null,
      max: null,
      consensus: false,
    };

    if (numericVotes.length > 0) {
      const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      stats = {
        average: Math.round(avg * 100) / 100,
        min: Math.min(...numericVotes),
        max: Math.max(...numericVotes),
        consensus: new Set(numericVotes).size === 1,
      };
    }

    const payload = {
      roomId: this.room.id,
      revealed: this.roomState.revealed,
      currentStory: this.roomState.currentStory,
      deckType: this.roomState.deckType,
      voters: voters.map((p) => ({
        participantId: p.id,
        displayName: p.displayName,
        role: p.role,
        hasVoted: p.hasVoted,
        // Only expose vote value when revealed
        vote: this.roomState.revealed ? p.vote : p.hasVoted ? "hidden" : null,
      })),
      spectators: spectators.map((p) => ({
        participantId: p.id,
        displayName: p.displayName,
      })),
      stats: this.roomState.revealed ? stats : null,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ── Connection lifecycle ───────────────────────────────────────────────────

  async onConnect(connection: Party.Connection) {
    const state = this.getFullState();
    const msg: ServerMessage = { type: "state", state, yourId: connection.id };
    connection.send(JSON.stringify(msg));
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;
      const connectionId = sender.id;

      switch (data.type) {
        case "join":
          this.handleJoin(connectionId, data.persistentId, data.displayName, data.role, sender, data.team);
          break;
        case "vote":
          this.handleVote(connectionId, data.value);
          break;
        case "reveal":
          this.handleReveal(connectionId);
          break;
        case "clear":
          this.handleClear(connectionId);
          break;
        case "set-story":
          this.handleSetStory(connectionId, data.title);
          break;
        case "set-deck":
          this.handleSetDeck(connectionId, data.deckType, data.customValues);
          break;
        case "start-timer":
          this.handleStartTimer(connectionId, data.seconds);
          break;
        case "stop-timer":
          this.handleStopTimer(connectionId);
          break;
        case "set-teams":
          this.handleSetTeams(connectionId, data.teams);
          break;
        case "kick":
          this.handleKick(connectionId, data.participantId);
          break;
      }
    } catch {
      this.sendError(sender.id, "Failed to process message");
    }
  }

  async onClose(connection: Party.Connection) {
    const connectionId = connection.id;
    const participantId = this.getParticipantId(connectionId);

    this.connectionMap.delete(connectionId);
    this.reverseConnectionMap.delete(participantId);

    const participant = this.participants.get(participantId);
    if (!participant) return;

    this.participants.delete(participantId);

    // Save for reconnect (e.g. browser switch / network blip)
    this.previousParticipants.set(participantId, { ...participant });

    // If moderator disconnected, temporarily promote someone else
    if (this.roomState.moderatorId === participantId) {
      const remaining = Array.from(this.participants.values());
      if (remaining.length > 0) {
        const tempMod = remaining[0];
        tempMod.role = "moderator";
        this.roomState.moderatorId = tempMod.id;
      }
      // If no one remains, keep moderatorId — original will reclaim on reconnect
    }

    const leftMsg: ServerMessage = { type: "participant-left", id: participantId };
    this.room.broadcast(JSON.stringify(leftMsg));
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  private handleJoin(
    connectionId: string,
    persistentId: string | undefined,
    displayName: string,
    role: "voter" | "spectator",
    connection: Party.Connection,
    team?: string
  ) {
    const participantId = persistentId || connectionId;

    // Update connection ↔ participant maps
    this.connectionMap.set(connectionId, participantId);
    this.reverseConnectionMap.set(participantId, connectionId);

    // Already active in another tab/browser — just resync state
    const existingActive = this.participants.get(participantId);
    if (existingActive) {
      const state = this.getFullState();
      const msg: ServerMessage = { type: "state", state, yourId: participantId };
      connection.send(JSON.stringify(msg));
      return;
    }

    // Reconnecting after disconnect — restore previous session
    const prev = this.previousParticipants.get(participantId);
    let participant: Participant;

    if (prev) {
      this.previousParticipants.delete(participantId);
      participant = { ...prev };

      // Original moderator reconnecting — restore role even if someone else was promoted
      if (prev.role === "moderator") {
        const currentMod = this.participants.get(this.roomState.moderatorId);
        if (currentMod && currentMod.id !== participantId) {
          currentMod.role = "voter";
        }
        this.roomState.moderatorId = participantId;
        participant.role = "moderator";
      }
    } else {
      // New join
      if (this.participants.size === 0) {
        this.roomState.moderatorId = participantId;
      }
      participant = {
        id: participantId,
        displayName,
        role: this.roomState.moderatorId === participantId ? "moderator" : role,
        vote: null,
        hasVoted: false,
        joinedAt: new Date().toISOString(),
        team,
      };
    }

    this.participants.set(participantId, participant);

    const joinedMsg: ServerMessage = { type: "participant-joined", participant };
    this.room.broadcast(JSON.stringify(joinedMsg));

    const state = this.getFullState();
    const stateMsg: ServerMessage = { type: "state", state, yourId: participantId };
    connection.send(JSON.stringify(stateMsg));
  }

  private handleVote(connectionId: string, value: string | number) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant) return;

    participant.vote = value;
    participant.hasVoted = true;

    const voteMsg: ServerMessage = { type: "vote-cast", id: participantId };
    this.room.broadcast(JSON.stringify(voteMsg));

    if (this.roomState.settings.autoRevealWhenAllVoted) {
      const allVoters = Array.from(this.participants.values()).filter(
        (p) => p.role === "voter"
      );
      const allHaveVoted = allVoters.every((p) => p.hasVoted);
      if (allHaveVoted && allVoters.length > 0) {
        this.revealVotes();
      }
    }
  }

  private handleReveal(connectionId: string) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can reveal votes");
      return;
    }
    this.revealVotes();
  }

  private handleClear(connectionId: string) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can clear votes");
      return;
    }

    this.stopTimerInternal();

    for (const p of this.participants.values()) {
      p.vote = null;
      p.hasVoted = false;
    }
    this.roomState.revealed = false;

    const clearMsg: ServerMessage = { type: "votes-cleared" };
    this.room.broadcast(JSON.stringify(clearMsg));
  }

  private handleSetStory(connectionId: string, title: string) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can set story");
      return;
    }

    this.roomState.currentStory = title;
    for (const p of this.participants.values()) {
      p.vote = null;
      p.hasVoted = false;
    }
    this.roomState.revealed = false;

    const storyMsg: ServerMessage = { type: "story-updated", title };
    this.room.broadcast(JSON.stringify(storyMsg));
  }

  private handleSetDeck(
    connectionId: string,
    deckType: DeckType,
    customValues?: string[]
  ) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can set deck");
      return;
    }

    this.roomState.deckType = deckType;
    if (customValues) {
      this.roomState.customDeck = customValues;
    }

    const deckMsg: ServerMessage = { type: "deck-updated", deckType, customValues };
    this.room.broadcast(JSON.stringify(deckMsg));
  }

  private handleStartTimer(connectionId: string, seconds: number) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can start timer");
      return;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const startedAt = new Date().toISOString();
    this.roomState.timerSeconds = seconds;
    this.roomState.timerStartedAt = startedAt;

    const timerMsg: ServerMessage = { type: "timer-started", seconds, startedAt };
    this.room.broadcast(JSON.stringify(timerMsg));

    this.timerInterval = setInterval(() => {
      if (this.roomState.timerSeconds !== null) {
        this.roomState.timerSeconds--;
        if (this.roomState.timerSeconds <= 0) {
          this.stopTimerInternal();
        }
      }
    }, 1000);
  }

  private handleStopTimer(connectionId: string) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can stop timer");
      return;
    }
    this.stopTimerInternal();
  }

  private handleSetTeams(connectionId: string, teams: string[]) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can configure teams");
      return;
    }
    this.roomState.teamGroups = teams.length > 0 ? teams : undefined;
    const msg: ServerMessage = { type: "teams-updated", teams };
    this.room.broadcast(JSON.stringify(msg));
  }

  private handleKick(connectionId: string, targetParticipantId: string) {
    const participantId = this.getParticipantId(connectionId);
    const participant = this.participants.get(participantId);
    if (!participant || participant.role !== "moderator") {
      this.sendError(connectionId, "Only moderator can kick participants");
      return;
    }

    // Find their current connection
    const targetConnection = this.getConnectionForParticipant(targetParticipantId);
    if (targetConnection) {
      const kickMsg: ServerMessage = { type: "kicked" };
      targetConnection.send(JSON.stringify(kickMsg));
      targetConnection.close();
    }

    // Also prevent reconnect
    this.previousParticipants.delete(targetParticipantId);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private stopTimerInternal() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.roomState.timerSeconds !== null || this.roomState.timerStartedAt !== null) {
      this.roomState.timerSeconds = null;
      this.roomState.timerStartedAt = null;
      const stopMsg: ServerMessage = { type: "timer-stopped" };
      this.room.broadcast(JSON.stringify(stopMsg));
    }
  }

  private revealVotes() {
    this.stopTimerInternal();
    this.roomState.revealed = true;

    const votes: Record<string, string | number | null> = {};
    for (const [id, participant] of this.participants) {
      votes[id] = participant.vote;
    }

    const revealMsg: ServerMessage = { type: "votes-revealed", votes };
    this.room.broadcast(JSON.stringify(revealMsg));
  }

  private getFullState(): FullRoomState {
    const participants: Record<string, Participant> = {};
    for (const [id, participant] of this.participants) {
      participants[id] = participant;
    }
    return { room: this.roomState, participants };
  }
}
