"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus } from "@/lib/realtime/types";
import { reconnectDelay } from "@/lib/realtime/websocket";

interface ReconnectingWebSocketOptions<TMessage, TSnapshot> {
  url: string | null;
  enabled?: boolean;
  parseMessage: (raw: unknown) => TMessage | null;
  resynchronize: (signal: AbortSignal) => Promise<TSnapshot>;
  onSynchronized: (snapshot: TSnapshot, buffered: TMessage[]) => void;
  onMessage: (message: TMessage) => void;
}

export interface ReconnectingWebSocketResult {
  status: ConnectionStatus;
  closePermanently: () => void;
}

export function useReconnectingWebSocket<TMessage, TSnapshot>({
  url,
  enabled = true,
  parseMessage,
  resynchronize,
  onSynchronized,
  onMessage,
}: ReconnectingWebSocketOptions<TMessage, TSnapshot>): ReconnectingWebSocketResult {
  const [status, setStatus] = useState<ConnectionStatus>(
    enabled && url ? "connecting" : "disconnected",
  );
  const callbacksRef = useRef({
    parseMessage,
    resynchronize,
    onSynchronized,
    onMessage,
  });
  const socketRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeRef = useRef(false);
  const intentionalRef = useRef(false);
  const generationRef = useRef(0);
  const retryRef = useRef(0);
  const connectedOnceRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = {
      parseMessage,
      resynchronize,
      onSynchronized,
      onMessage,
    };
  }, [parseMessage, resynchronize, onSynchronized, onMessage]);

  const closePermanently = useCallback(() => {
    intentionalRef.current = true;
    activeRef.current = false;
    generationRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close(1000, "Realtime updates no longer required");
    }
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    if (!enabled || !url) {
      return;
    }

    activeRef.current = true;
    intentionalRef.current = false;
    retryRef.current = 0;
    connectedOnceRef.current = false;
    const scheduleReconnect = () => {
      if (!activeRef.current || intentionalRef.current) return;
      setStatus("reconnecting");
      const delay = reconnectDelay(retryRef.current);
      retryRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    const connect = () => {
      if (!activeRef.current || intentionalRef.current) return;
      timerRef.current = null;
      const generation = ++generationRef.current;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;
      let synchronizing = false;
      let buffer: TMessage[] = [];

      socket.onmessage = (event) => {
        if (!activeRef.current || generation !== generationRef.current) return;
        const message = callbacksRef.current.parseMessage(event.data);
        if (!message) return;
        if (synchronizing) buffer.push(message);
        else callbacksRef.current.onMessage(message);
      };

      socket.onopen = async () => {
        if (!activeRef.current || generation !== generationRef.current) return;
        synchronizing = true;
        setStatus(
          connectedOnceRef.current || retryRef.current > 0
            ? "reconnecting"
            : "connecting",
        );
        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;
        try {
          const snapshot = await callbacksRef.current.resynchronize(controller.signal);
          if (
            controller.signal.aborted ||
            !activeRef.current ||
            generation !== generationRef.current
          ) return;
          const buffered = buffer;
          buffer = [];
          synchronizing = false;
          callbacksRef.current.onSynchronized(snapshot, buffered);
          retryRef.current = 0;
          connectedOnceRef.current = true;
          abortRef.current = null;
          setStatus("connected");
        } catch {
          if (
            controller.signal.aborted ||
            !activeRef.current ||
            generation !== generationRef.current
          ) return;
          buffer = [];
          synchronizing = false;
          abortRef.current = null;
          socket.close();
        }
      };

      socket.onerror = () => {
        // The close event owns retries; browsers provide no useful error details here.
      };

      socket.onclose = () => {
        if (generation !== generationRef.current) return;
        abortRef.current?.abort();
        abortRef.current = null;
        buffer = [];
        synchronizing = false;
        socketRef.current = null;
        scheduleReconnect();
      };
    };

    connect();
    return () => {
      activeRef.current = false;
      intentionalRef.current = true;
      generationRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close(1000, "Component unmounted");
      }
    };
  }, [enabled, url]);

  return { status, closePermanently };
}
