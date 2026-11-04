package com.unikart.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConfigParameterRepository extends JpaRepository<ConfigParameter, UUID> {
    Optional<ConfigParameter> findByParamKeyAndEffectiveToIsNull(String paramKey);
    List<ConfigParameter> findByEffectiveToIsNullOrderByParamKeyAsc();
}
