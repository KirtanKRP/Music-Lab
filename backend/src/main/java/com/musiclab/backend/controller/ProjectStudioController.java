package com.musiclab.backend.controller;

import com.musiclab.backend.domain.MusicProject;
import com.musiclab.backend.service.ProjectIioService;
import com.musiclab.backend.service.ProjectManagementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

/**
 * REST controller exposing studio endpoints for project persistence and serialization.
 *
 * AJT Syllabus: Unit 6/7 — Servlets & REST Compliance
 */
@RestController
@RequestMapping("/api/v1/studio")
public class ProjectStudioController {

    private static final Logger logger = LoggerFactory.getLogger(ProjectStudioController.class);

    private final ProjectIioService projectIioService;
    private final ProjectManagementService projectManagementService;

    public ProjectStudioController(ProjectIioService projectIioService,
                                   ProjectManagementService projectManagementService) {
        this.projectIioService = projectIioService;
        this.projectManagementService = projectManagementService;
    }

    /**
     * GET /api/v1/studio/load/{projectId}
     * Reads the serialized byte[] from PostgreSQL, deserializes it via ObjectInputStream (Unit 2),
     * and returns the reconstructed MusicProject as JSON.
     *
     * The frontend uses this to rehydrate both the Zustand store (visual) and Tone.js (audio).
     */
    @GetMapping("/load/{projectId}")
    public ResponseEntity<?> loadProject(@PathVariable String projectId) {
        logger.info("Received load request for project: {}", projectId);

        try {
            MusicProject project = projectManagementService.loadProjectState(projectId);

            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Project not found: " + projectId
                ));
            }

            return ResponseEntity.ok(project);

        } catch (RuntimeException e) {
            logger.error("Load project failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Failed to load project: " + e.getMessage()
            ));
        }
    }

    /**
     * POST /api/v1/studio/save
     * Accepts a JSON MusicProject, serializes it via Java ObjectOutputStream (Unit 2),
     * and persists it to PostgreSQL within a @Transactional boundary (Unit 4).
     *
     * This is the primary save endpoint used by the Next.js frontend.
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveProject(@RequestBody MusicProject project) {
        logger.info("Received save request for project: {} (ID: {})", project.getProjectName(), project.getProjectId());

        try {
            Long ownerUserId = resolveUserId(project);
            projectManagementService.saveProjectState(project, ownerUserId);

            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Project saved successfully (Serialized via ObjectOutputStream → DB)",
                    "projectId", project.getProjectId(),
                "projectName", project.getProjectName(),
                "ownerUserId", ownerUserId
            );

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            logger.error("Save project failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Failed to save project: " + e.getMessage()
            ));
        }
    }

    private Long resolveUserId(MusicProject project) {
        String payloadUserId = project.getUserId();
        if (payloadUserId == null || payloadUserId.isBlank()) {
            return 1L;
        }

        try {
            return Long.parseLong(payloadUserId);
        } catch (NumberFormatException e) {
            logger.warn("Invalid userId '{}' in save payload. Falling back to userId=1", payloadUserId);
            return 1L;
        }
    }

    /**
     * POST /api/v1/studio/serialize
     * Accepts a JSON MusicProject, serializes it via Java I/O, and returns a success response.
     * (Utility endpoint for testing serialization without DB persistence)
     */
    @PostMapping("/serialize")
    public ResponseEntity<Map<String, Object>> serializeProject(@RequestBody MusicProject project) {
        logger.info("Received serialize request for project: {}", project.getProjectName());

        try {
            byte[] serializedData = projectIioService.serializeProject(project);

            // Encode to Base64 for safe transport
            String base64Data = Base64.getEncoder().encodeToString(serializedData);

            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Project serialized successfully via Java ObjectOutputStream (Unit 2)",
                    "projectId", project.getProjectId(),
                    "serializedSizeBytes", serializedData.length,
                    "serializedData", base64Data
            );

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            logger.error("Serialization endpoint error: {}", e.getMessage());
            Map<String, Object> errorResponse = Map.of(
                    "status", "error",
                    "message", "Serialization failed: " + e.getMessage()
            );
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * POST /api/v1/studio/deserialize
     * Accepts a Base64-encoded serialized MusicProject and reconstructs it.
     */
    @PostMapping("/deserialize")
    public ResponseEntity<Map<String, Object>> deserializeProject(@RequestBody Map<String, String> payload) {
        logger.info("Received deserialize request");

        String base64Data = payload.get("serializedData");
        if (base64Data == null || base64Data.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Missing 'serializedData' field in request body"
            ));
        }

        try {
            byte[] data = Base64.getDecoder().decode(base64Data);
            MusicProject project = projectIioService.deserializeProject(data);

            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Project deserialized successfully via Java ObjectInputStream (Unit 2)",
                    "project", project
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("Invalid Base64 data: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "Invalid Base64 data: " + e.getMessage()
            ));
        } catch (IOException | ClassNotFoundException e) {
            logger.error("Deserialization endpoint error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Deserialization failed: " + e.getMessage()
            ));
        }
    }
}

