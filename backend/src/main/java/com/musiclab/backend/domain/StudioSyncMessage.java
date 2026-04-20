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
    private String actionType;       // e.g., "PLAY", "PAUSE", "STOP", "SEEK", "TRACK_MUTE", "BPM_CHANGE"
    private double playheadPosition;
    private String trackId;
    private Integer bpm;
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

    public Integer getBpm() {
        return bpm;
    }

    public void setBpm(Integer bpm) {
        this.bpm = bpm;
    }

    @Override
    public String toString() {
        return "StudioSyncMessage{projectId='" + projectId + "', actionType='" + actionType
                + "', playheadPosition=" + playheadPosition + ", trackId='" + trackId
                + "', bpm=" + bpm + ", sourceClientId='" + sourceClientId + "'}";
    }
}
