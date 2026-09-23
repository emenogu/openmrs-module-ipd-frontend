FROM ghcr.io/emenogu/nmhs-modern-ipd@sha256:b3965244b773d59f1b204ca9a3a3d232517015d9dc62a6f18109005ed550a196

ARG SOURCE_SHA
ARG SOURCE_TREE
ARG VALIDATION_CONTROL
ARG VALIDATION_RUN

LABEL nmhs.gate="G3-NMHS-CAREVIEW-THEME"
LABEL nmhs.component="ipd"
LABEL nmhs.source.commit="${SOURCE_SHA}"
LABEL nmhs.source.tree="${SOURCE_TREE}"
LABEL nmhs.validation.control="${VALIDATION_CONTROL}"
LABEL nmhs.validation.run="${VALIDATION_RUN}"
LABEL nmhs.base.image="ghcr.io/emenogu/nmhs-modern-ipd@sha256:b3965244b773d59f1b204ca9a3a3d232517015d9dc62a6f18109005ed550a196"
LABEL nmhs.scope="non-semantic-nmhs-presentation-overlay"

RUN rm -rf /usr/local/apache2/htdocs/ipd/*

COPY runtime-stage/. /usr/local/apache2/htdocs/ipd/
