package com.musiclab.backend.controller;

import com.musiclab.backend.service.AudioFileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Map;

/**
 * REST controller for audio file upload and streaming.
 *
 * AJT Syllabus: Unit 7 — REST API, Unit 2 — Java I/O (file streaming)
 */
@RestController
@RequestMapping("/api/v1/audio")
public class AudioAssetController {

    private static final Logger logger = LoggerFactory.getLogger(AudioAssetController.class);

    private final AudioFileStorageService audioFileStorageService;

    public AudioAssetController(AudioFileStorageService audioFileStorageService) {
        this.audioFileStorageService = audioFileStorageService;
    }

    /**
     * POST /api/v1/audio/upload
     * Accepts a multipart audio file, stores it, and returns the generated filename.
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadAudioFile(@RequestParam("file") MultipartFile file) {
        logger.info("Upload request received: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", "File is empty"
            ));
        }

        try {
            String storedFilename = audioFileStorageService.storeAudioFile(file);

            Map<String, Object> response = Map.of(
                    "status", "success",
                    "message", "Audio file uploaded successfully",
                    "originalFilename", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                    "storedFilename", storedFilename,
                    "sizeBytes", file.getSize(),
                    "streamUrl", "/api/v1/audio/stream/" + storedFilename
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IOException e) {
            logger.error("Failed to upload audio file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", "Failed to store audio file: " + e.getMessage()
            ));
        }
    }

    /**
     * GET /api/v1/audio/stream/{filename}
     * Streams the audio file with the correct Content-Type header so the browser's
     * Web Audio API / Tone.js can decode it properly.
     */
    @GetMapping("/stream/{filename}")
    public ResponseEntity<Resource> streamAudioFile(@PathVariable String filename) {
        logger.info("Stream request for: {}", filename);

        try {
            Resource resource = audioFileStorageService.loadAudioFileAsResource(filename);

            // Prefer DB-stored content type for shared assets, fallback to extension mapping.
            String storedContentType = audioFileStorageService.getStoredContentType(filename);
            MediaType mediaType = resolveMediaType(filename, storedContentType);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (FileNotFoundException e) {
            logger.error("Audio file not found: {}", filename);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Resolves the appropriate MIME type based on the audio file extension.
     */
    private MediaType resolveMediaType(String filename, String explicitContentType) {
        if (explicitContentType != null && !explicitContentType.isBlank()) {
            try {
                return MediaType.parseMediaType(explicitContentType);
            } catch (InvalidMediaTypeException e) {
                logger.warn("Invalid DB content type '{}' for '{}'. Falling back to extension.",
                        explicitContentType, filename);
            }
        }

        String lowerFilename = filename.toLowerCase();

        if (lowerFilename.endsWith(".mp3")) {
            return MediaType.parseMediaType("audio/mpeg");
        } else if (lowerFilename.endsWith(".wav")) {
            return MediaType.parseMediaType("audio/wav");
        } else if (lowerFilename.endsWith(".ogg")) {
            return MediaType.parseMediaType("audio/ogg");
        } else if (lowerFilename.endsWith(".flac")) {
            return MediaType.parseMediaType("audio/flac");
        } else if (lowerFilename.endsWith(".aac") || lowerFilename.endsWith(".m4a")) {
            return MediaType.parseMediaType("audio/aac");
        } else if (lowerFilename.endsWith(".webm")) {
            return MediaType.parseMediaType("audio/webm");
        } else {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
