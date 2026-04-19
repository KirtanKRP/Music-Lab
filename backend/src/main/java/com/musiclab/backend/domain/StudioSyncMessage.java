package com.musiclab.backend.domain;

/**
 * Payload for real-time studio synchronization over WebSocket.
 * Carries studio events (playhead movement, track mute/unmute, etc.)
 * between collaborators in the same project.
 *
 * AJT Syllabus: Unit 3 — Java Networking (WebSocket message format)
 */
public class StudioSyncMessage {

    private String projectId;
    private String actionType;       // e.g., "PLAYHEAD_MOVE", "TRACK_MUTE", "TRACK_UNMUTE", "BPM_CHANGE"
    private double playheadPosition;
    private String trackId;
    private String sourceClientId;

    // Default constructor (required for JSON deserialization)
    public StudioSyncMessage() {}

    public StudioSyncMessage(String projectId, String actionType, double playheadPosition, String trackId) {
        this.projectId = projectId;
        this.actionType = actionType;
        this.playheadPosition = playheadPosition;
        this.trackId = trackId;
    }

    // --- Getters & Setters ---

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public double getPlayheadPosition() {
        return playheadPosition;
    }

    public void setPlayheadPosition(double playheadPosition) {
        this.playheadPosition = playheadPosition;
    }

    public String getTrackId() {
        return trackId;
    }

    public void setTrackId(String trackId) {
        this.trackId = trackId;
    }

    public String getSourceClientId() {
        return sourceClientId;
    }

    public void setSourceClientId(String sourceClientId) {
        this.sourceClientId = sourceClientId;
    }

    @Override
    public String toString() {
        return "StudioSyncMessage{projectId='" + projectId + "', actionType='" + actionType
                + "', playheadPosition=" + playheadPosition + ", trackId='" + trackId
                + "', sourceClientId='" + sourceClientId + "'}";
    }
}
