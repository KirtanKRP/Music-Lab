import { Client, IMessage } from "@stomp/stompjs";

const wsUrl =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/^http/, "ws") +
  "/ws-studio";

/**
 * Singleton WebSocket client for real-time studio collaboration.
 * Connects to the Spring Boot STOMP broker at /ws-studio and
 * handles pub/sub for project-specific sync events.
 *
 * AJT Syllabus: Unit 3 — Java Networking (WebSocket client-side)
 */
class StudioSocketClient {
  private static instance: StudioSocketClient | null = null;
  private client: Client | null = null;
  private connected = false;
  private currentProjectId: string | null = null;
  private readonly clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  private constructor() {
    // Private constructor enforces Singleton pattern (Unit 8)
  }

  static getInstance(): StudioSocketClient {
    if (!StudioSocketClient.instance) {
      StudioSocketClient.instance = new StudioSocketClient();
    }
    return StudioSocketClient.instance;
  }

  /**
   * Connects to the STOMP broker and subscribes to the project's topic.
   *
   * @param projectId - The project to join for real-time sync
   * @param onMessageReceived - Callback invoked for each incoming sync message
   */
  connect(projectId: string, onMessageReceived: (msg: StudioSyncPayload) => void): void {
    // Disconnect existing connection if switching projects
    if (this.client && this.connected) {
      this.disconnect();
    }

    this.currentProjectId = projectId;

    this.client = new Client({
      brokerURL: wsUrl,

      // Reconnect automatically on disconnect
      reconnectDelay: 5000,

      onConnect: () => {
        this.connected = true;
        console.log(`[StudioSocket] Connected to STOMP broker for project: ${projectId}`);

        // Subscribe to the project-specific topic
        this.client?.subscribe(`/topic/project/${projectId}`, (message: IMessage) => {
          try {
            const payload: StudioSyncPayload = JSON.parse(message.body);

            if (payload.sourceClientId && payload.sourceClientId === this.clientId) {
              console.log("[StudioSocket] Ignored self message:", payload.actionType, payload.trackId);
              return;
            }

            console.log("[StudioSocket] Received:", payload.actionType, payload.trackId);
            onMessageReceived(payload);
          } catch (e) {
            console.error("[StudioSocket] Failed to parse message:", e);
          }
        });
      },

      onDisconnect: () => {
        this.connected = false;
        console.log("[StudioSocket] Disconnected from STOMP broker");
      },

      onStompError: (frame) => {
        console.error("[StudioSocket] STOMP error:", frame.headers["message"]);
      },
    });

    this.client.activate();
  }

  /**
   * Publishes a sync event to the Spring Boot STOMP handler.
   * Maps to @MessageMapping("/studio.sync") in LiveStudioController.java.
   *
   * @param projectId - Project scope
   * @param actionType - e.g., "TRACK_MUTE", "PLAYHEAD_MOVE", "BPM_CHANGE"
   * @param trackId - The affected track (empty string if not track-specific)
   */
  sendSyncEvent(
    projectId: string,
    actionType: string,
    trackId: string = "",
    playheadPosition: number = 0,
    bpm?: number
  ): void {
    if (!this.client || !this.connected) {
      console.warn("[StudioSocket] Not connected. Cannot send event.");
      return;
    }

    const payload: StudioSyncPayload = {
      projectId,
      actionType,
      playheadPosition,
      trackId,
      sourceClientId: this.clientId,
    };

    if (typeof bpm === "number") {
      payload.bpm = bpm;
    }

    this.client.publish({
      destination: "/app/studio.sync",
      body: JSON.stringify(payload),
    });

    console.log("[StudioSocket] Sent:", actionType, trackId);
  }

  /**
   * Disconnects from the STOMP broker and cleans up.
   */
  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      this.currentProjectId = null;
      console.log("[StudioSocket] Disconnected and cleaned up");
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

/**
 * Matches the Java StudioSyncMessage POJO.
 */
export interface StudioSyncPayload {
  projectId: string;
  actionType: string;
  playheadPosition: number;
  trackId: string;
  bpm?: number;
  sourceClientId?: string;
}

export default StudioSocketClient;
