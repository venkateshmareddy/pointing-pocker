import type * as Party from "partykit/server";
import type {
  ClientMessage,
  ServerMessage,
  RoomState,
  Participant,
  FullRoomState,
  DeckType,
  RoomSettings,
} from "@pointing-poker/shared/types";

export default class PointingPokerServer implements Party.Server {
  static options = { hibernate: true };

  private participants: Map<string, Participant> = new Map();
  private roomState: RoomState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {
    // Initialize room state with defaults
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

  async onConnect(connection: Party.Connection) {
    const userId = connection.id;

    // Send current state to new connection, including their connection ID
    const state = this.getFullState();
    const message: ServerMessage = { type: "state", state, yourId: userId };
    connection.send(JSON.stringify(message));
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage;
      const userId = sender.id;

      switch (data.type) {
        case "join":
          this.handleJoin(userId, data.displayName, data.role, sender);
          break;
        case "vote":
          this.handleVote(userId, data.value);
          break;
        case "reveal":
          this.handleReveal(userId);
          break;
        case "clear":
          this.handleClear(userId);
          break;
        case "set-story":
          this.handleSetStory(userId, data.title);
          break;
        case "set-deck":
          this.handleSetDeck(userId, data.deckType, data.customValues);
          break;
        case "start-timer":
          this.handleStartTimer(userId, data.seconds);
          break;
        case "stop-timer":
          this.handleStopTimer(userId);
          break;
        case "kick":
          this.handleKick(userId, data.participantId);
          break;
      }
    } catch (error) {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Failed to process message",
      };
      sender.send(JSON.stringify(errorMessage));
    }
  }

  async onClose(connection: Party.Connection) {
    const userId = connection.id;
    const participant = this.participants.get(userId);

    if (participant) {
      this.participants.delete(userId);

      // If moderator leaves, assign to the next person
      if (this.roomState.moderatorId === userId) {
        const remainingParticipants = Array.from(this.participants.values());
        if (remainingParticipants.length > 0) {
          const newModerator = remainingParticipants[0];
          this.roomState.moderatorId = newModerator.id;
          newModerator.role = "moderator";
        } else {
          this.roomState.moderatorId = "";
        }
      }

      // Broadcast participant left
      const leftMessage: ServerMessage = { type: "participant-left", id: userId };
      this.room.broadcast(JSON.stringify(leftMessage));
    }
  }

  private handleJoin(
    userId: string,
    displayName: string,
    role: "voter" | "spectator",
    connection: Party.Connection
  ) {
    // First person to join becomes moderator
    if (this.participants.size === 0) {
      this.roomState.moderatorId = userId;
    }

    const participant: Participant = {
      id: userId,
      displayName,
      role: this.roomState.moderatorId === userId ? "moderator" : role,
      vote: null,
      hasVoted: false,
      joinedAt: new Date().toISOString(),
    };

    this.participants.set(userId, participant);

    // Broadcast new participant
    const joinedMessage: ServerMessage = {
      type: "participant-joined",
      participant,
    };
    this.room.broadcast(JSON.stringify(joinedMessage));

    // Send full state to the joining participant
    const state = this.getFullState();
    const stateMessage: ServerMessage = { type: "state", state, yourId: userId };
    connection.send(JSON.stringify(stateMessage));
  }

  private handleVote(userId: string, value: string | number) {
    const participant = this.participants.get(userId);
    if (!participant) return;

    participant.vote = value;
    participant.hasVoted = true;

    // Broadcast vote cast (without the value to keep votes hidden)
    const voteMessage: ServerMessage = { type: "vote-cast", id: userId };
    this.room.broadcast(JSON.stringify(voteMessage));

    // Check if auto-reveal should happen
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

  private handleReveal(userId: string) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can reveal votes",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    this.revealVotes();
  }

  private stopTimerInternal() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.roomState.timerSeconds !== null || this.roomState.timerStartedAt !== null) {
      this.roomState.timerSeconds = null;
      this.roomState.timerStartedAt = null;
      const stopMessage: ServerMessage = { type: "timer-stopped" };
      this.room.broadcast(JSON.stringify(stopMessage));
    }
  }

  private revealVotes() {
    this.stopTimerInternal();
    this.roomState.revealed = true;

    const votes: Record<string, string | number | null> = {};
    for (const [id, participant] of this.participants) {
      votes[id] = participant.vote;
    }

    const revealMessage: ServerMessage = { type: "votes-revealed", votes };
    this.room.broadcast(JSON.stringify(revealMessage));
  }

  private handleClear(userId: string) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can clear votes",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    this.stopTimerInternal();

    // Clear all votes
    for (const p of this.participants.values()) {
      p.vote = null;
      p.hasVoted = false;
    }

    this.roomState.revealed = false;

    const clearMessage: ServerMessage = { type: "votes-cleared" };
    this.room.broadcast(JSON.stringify(clearMessage));
  }

  private handleSetStory(userId: string, title: string) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can set story",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    this.roomState.currentStory = title;

    // Clear votes when story changes
    for (const p of this.participants.values()) {
      p.vote = null;
      p.hasVoted = false;
    }
    this.roomState.revealed = false;

    const storyMessage: ServerMessage = {
      type: "story-updated",
      title,
    };
    this.room.broadcast(JSON.stringify(storyMessage));
  }

  private handleSetDeck(
    userId: string,
    deckType: DeckType,
    customValues?: string[]
  ) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can set deck",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    this.roomState.deckType = deckType;
    if (customValues) {
      this.roomState.customDeck = customValues;
    }

    const deckMessage: ServerMessage = {
      type: "deck-updated",
      deckType,
      customValues,
    };
    this.room.broadcast(JSON.stringify(deckMessage));
  }

  private handleStartTimer(userId: string, seconds: number) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can start timer",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    // Stop existing timer if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const startedAt = new Date().toISOString();
    this.roomState.timerSeconds = seconds;
    this.roomState.timerStartedAt = startedAt;

    const timerMessage: ServerMessage = {
      type: "timer-started",
      seconds,
      startedAt,
    };
    this.room.broadcast(JSON.stringify(timerMessage));

    // Setup interval to decrement timer and auto-stop when done
    this.timerInterval = setInterval(() => {
      if (this.roomState.timerSeconds !== null) {
        this.roomState.timerSeconds--;

        if (this.roomState.timerSeconds <= 0) {
          this.handleStopTimer(userId);
        }
      }
    }, 1000);
  }

  private handleStopTimer(userId: string) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can stop timer",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.roomState.timerSeconds = null;
    this.roomState.timerStartedAt = null;

    const stopMessage: ServerMessage = { type: "timer-stopped" };
    this.room.broadcast(JSON.stringify(stopMessage));
  }

  private handleKick(userId: string, participantId: string) {
    const participant = this.participants.get(userId);
    if (!participant || participant.role !== "moderator") {
      const errorMessage: ServerMessage = {
        type: "error",
        message: "Only moderator can kick participants",
      };
      const connection = this.room.getConnection(userId);
      if (connection) {
        connection.send(JSON.stringify(errorMessage));
      }
      return;
    }

    const connection = this.room.getConnection(participantId);
    if (connection) {
      const kickMessage: ServerMessage = { type: "kicked" };
      connection.send(JSON.stringify(kickMessage));
      connection.close();
    }
  }

  private getFullState(): FullRoomState {
    const participants: Record<string, Participant> = {};
    for (const [id, participant] of this.participants) {
      participants[id] = participant;
    }

    return {
      room: this.roomState,
      participants,
    };
  }
}

