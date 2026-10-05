FROM ghcr.io/emenogu/nmhs-modern-ipd@sha256:3ff4baef4ab19e957d9930b0d54f2ed0e161d8b003e7e5e0ad333c5c5bf0b3b7

ARG CONTROL_COMMIT
ARG VALIDATION_RUN
ARG ARTIFACT_ID
ARG ARTIFACT_SHA256

LABEL nmhs.gate="UPSTREAM-002-UP2-G6"
LABEL nmhs.component="ipd"
LABEL nmhs.frontend.control.commit="${CONTROL_COMMIT}"
LABEL nmhs.frontend.validation.run="${VALIDATION_RUN}"
LABEL nmhs.frontend.artifact.id="${ARTIFACT_ID}"
LABEL nmhs.frontend.artifact.sha256="${ARTIFACT_SHA256}"
LABEL nmhs.base.image="ghcr.io/emenogu/nmhs-modern-ipd@sha256:3ff4baef4ab19e957d9930b0d54f2ed0e161d8b003e7e5e0ad333c5c5bf0b3b7"
LABEL nmhs.scope="validated-up2-g6-selective-ipd-runtime"

RUN rm -rf /usr/local/apache2/htdocs/ipd/*
COPY runtime-stage/. /usr/local/apache2/htdocs/ipd/
