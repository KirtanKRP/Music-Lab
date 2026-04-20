package com.musiclab.backend.service;

import com.musiclab.backend.entity.AudioAssetEntity;
import com.musiclab.backend.repository.AudioAssetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for storing and retrieving audio files using Java NIO.
 *
 * AJT Syllabus: Unit 2 — Java I/O (modern java.nio.file API)
 */
@Service
public class AudioFileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(AudioFileStorageService.class);

    private final Path storageLocation;
    private final AudioAssetRepository audioAssetRepository;

    public AudioFileStorageService(@Value("${musiclab.storage.audio-dir:./storage/audio}") String audioDir,
                                   AudioAssetRepository audioAssetRepository) {
        this.storageLocation = Paths.get(audioDir).toAbsolutePath().normalize();
        this.audioAssetRepository = audioAssetRepository;
    }

    /**
     * Stores the uploaded audio file to the configured directory with a UUID-based filename.
     * Preserves the original file extension for Content-Type resolution during streaming.
     *
     * @param file the uploaded MultipartFile
     * @return the generated unique filename (UUID + original extension)
     * @throws IOException if the file cannot be written to disk
     */
    public String storeAudioFile(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String uniqueFilename = UUID.randomUUID() + extractExtension(originalFilename);
        byte[] fileBytes = file.getBytes();

        AudioAssetEntity asset = new AudioAssetEntity();
        asset.setStoredFilename(uniqueFilename);
        asset.setOriginalFilename(originalFilename != null ? originalFilename : uniqueFilename);
        asset.setContentType(file.getContentType());
        asset.setSizeBytes(file.getSize());
        asset.setFileData(fileBytes);
        asset.setCreatedAt(Instant.now());

        audioAssetRepository.save(asset);
        mirrorToLocalStorage(uniqueFilename, fileBytes);

        logger.info("Stored audio file in DB: {} ({} bytes) -> {}",
                originalFilename, file.getSize(), uniqueFilename);
        return uniqueFilename;
    }

    /**
     * Loads an audio file from disk as a Spring Resource for HTTP streaming.
     *
     * @param filename the unique filename generated during upload
     * @return the file as a Resource
     * @throws FileNotFoundException if the file does not exist or is not readable
     */
    @Transactional(readOnly = true)
    public Resource loadAudioFileAsResource(String filename) throws FileNotFoundException {
        Optional<AudioAssetEntity> dbAsset = audioAssetRepository.findByStoredFilename(filename);
        if (dbAsset.isPresent()) {
            AudioAssetEntity asset = dbAsset.get();
            logger.info("Loading audio file from DB: {}", filename);

            return new ByteArrayResource(asset.getFileData()) {
                @Override
                public String getFilename() {
                    return asset.getStoredFilename();
                }
            };
        }

        // Backward-compatible fallback for legacy local-only files.
        return loadLocalAudioFileAsResource(filename);
    }

    /**
     * Returns the stored content type when present in DB-backed assets.
     */
    @Transactional(readOnly = true)
    public String getStoredContentType(String filename) {
        return audioAssetRepository.findByStoredFilename(filename)
                .map(AudioAssetEntity::getContentType)
                .filter(contentType -> contentType != null && !contentType.isBlank())
                .orElse(null);
    }

    private void mirrorToLocalStorage(String uniqueFilename, byte[] fileBytes) {
        try {
            Files.createDirectories(storageLocation);

            Path targetPath = storageLocation.resolve(uniqueFilename).normalize();
            if (!targetPath.startsWith(storageLocation)) {
                throw new IOException("Cannot mirror file outside local storage directory");
            }

            Files.write(targetPath, fileBytes);
            logger.debug("Mirrored audio file locally: {}", uniqueFilename);

        } catch (IOException e) {
            // Shared DB storage is the source of truth; local mirror is best-effort only.
            logger.warn("Local audio mirror failed for '{}': {}", uniqueFilename, e.getMessage());
        }
    }

    private Resource loadLocalAudioFileAsResource(String filename) throws FileNotFoundException {
        try {
            Path filePath = storageLocation.resolve(filename).normalize();
            if (!filePath.startsWith(storageLocation)) {
                throw new FileNotFoundException("File path traversal detected: " + filename);
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                logger.info("Loading audio file from local fallback: {}", filename);
                return resource;
            }

            throw new FileNotFoundException("Audio file not found in DB or local storage: " + filename);

        } catch (MalformedURLException e) {
            logger.error("Malformed URL for file '{}': {}", filename, e.getMessage());
            throw new FileNotFoundException("Audio file not found: " + filename);
        }
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }
        return originalFilename.substring(originalFilename.lastIndexOf("."));
    }
}
