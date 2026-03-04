/// <reference types="vite/client" />
import { useEffect, useRef, useState, useCallback } from 'react';
import PartySocket from 'partysocket';
import type { ClientMessage, ServerMessage } from '@pointing-poker/shared/types';

export interface UsePartySockeReturn {
  sendMessage: (message: ClientMessage) => void;
  lastMessage: ServerMessage | null;
  connected: boolean;
  socketId: string | null;
}

export function usePartySocket(roomId: string): UsePartySockeReturn {
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const host =
      (import.meta as any).env?.VITE_PARTYKIT_HOST || `${window.location.hostname}:1999`;

    const socket = new PartySocket({
      host,
      room: roomId,
    });

    socket.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        setLastMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    socket.addEventListener('open', () => {
      setConnected(true);
      setSocketId(socket.id);
    });

    socket.addEventListener('close', () => {
      setConnected(false);
    });

    socket.addEventListener('error', (error: Event) => {
      console.error('WebSocket error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [roomId]);

  return { sendMessage, lastMessage, connected, socketId };
}
