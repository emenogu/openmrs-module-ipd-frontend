FROM bahmni/microfrontend-ipd@sha256:3f7b73f485acab356dbc5fc18b48a85793b8b0a169fe444e834d274b97247a6c

ARG SOURCE_SHA
ARG SOURCE_TREE
ARG SOURCE_PARENT
ARG VALIDATION_CONTROL
ARG VALIDATION_RUN
ARG ARTIFACT_ID
ARG ARTIFACT_SHA256

LABEL nmhs.component="ipd"
LABEL nmhs.source.commit="${SOURCE_SHA}"
LABEL nmhs.source.tree="${SOURCE_TREE}"
LABEL nmhs.source.parent="${SOURCE_PARENT}"
LABEL nmhs.validation.control="${VALIDATION_CONTROL}"
LABEL nmhs.validation.run="${VALIDATION_RUN}"
LABEL nmhs.artifact.id="${ARTIFACT_ID}"
LABEL nmhs.artifact.sha256="${ARTIFACT_SHA256}"

RUN rm -rf /usr/local/apache2/htdocs/ipd/*

COPY runtime-stage/. /usr/local/apache2/htdocs/ipd/
