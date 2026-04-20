package com.musiclab.backend.repository;

import com.musiclab.backend.entity.AudioAssetEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AudioAssetRepository extends JpaRepository<AudioAssetEntity, Long> {

    Optional<AudioAssetEntity> findByStoredFilename(String storedFilename);
}
