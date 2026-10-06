import axios from "axios";
import {
  BAHMNI_CORE_OBSERVATIONS_BASE_URL,
  FHIR_TASK_URL,
  defaultDateTimeFormat12Hrs,
} from "../../../../constants";
import { formatTime } from "../../../../utils/DateTimeUtils";

const OBSERVATIONS_URL = BAHMNI_CORE_OBSERVATIONS_BASE_URL.replace(/\?$/, "");

export const serializeParams = (params) =>
  Object.entries(params)
    .flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((paramValue) => `${key}=${encodeURIComponent(paramValue)}`)
        : [`${key}=${encodeURIComponent(value)}`]
    )
    .join("&");

export const fetchCareInstructionsObs = async (visitUuid, conceptNames) => {
  try {
    const response = await axios.get(OBSERVATIONS_URL, {
      params: {
        visitUuid,
        concept: conceptNames,
        filterObsWithOrders: false,
      },
      paramsSerializer: serializeParams,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch care instructions", error);
    return [];
  }
};

export const fetchTasksByObservationUuids = async (observationUuids) => {
  const uniqueObservationUuids = [
    ...new Set((observationUuids || []).filter(Boolean)),
  ];

  if (uniqueObservationUuids.length === 0) return [];

  try {
    const focusValues = uniqueObservationUuids
      .map((uuid) => `Observation/${uuid}`)
      .join(",");
    const response = await axios.get(
      `${FHIR_TASK_URL}?focus=${focusValues}&_count=500`,
      { withCredentials: true }
    );

    return (response.data?.entry || []).map((entry) => ({
      uuid: entry.resource?.id,
      observationUuid: entry.resource?.focus?.reference?.split("/").pop(),
      status: entry.resource?.status,
    }));
  } catch (error) {
    console.error("Failed to fetch tasks by observation UUIDs", error);
    return [];
  }
};

export const getAcknowledgedObservationUuids = (tasks) =>
  new Set(
    (tasks || [])
      .map((task) => task.observationUuid)
      .filter(Boolean)
  );

const extractObservationValue = (value) => {
  if (value == null) return "";
  if (typeof value === "object") {
    return value.display ?? value.name ?? "";
  }
  return String(value);
};

export const mapObservationsToInstructions = (
  observations,
  formConcepts
) => {
  if (!observations || !formConcepts || formConcepts.length === 0) {
    return [];
  }

  const formConceptsMap = new Map(
    formConcepts.map((formConcept) => [
      formConcept.formName,
      formConcept.concepts,
    ])
  );

  return observations.reduce((result, observation) => {
    if (!observation.formFieldPath) return result;

    const formName = observation.formFieldPath.split(".")[0];
    const allowedConcepts = formConceptsMap.get(formName);

    if (
      !allowedConcepts ||
      !observation.conceptFSN ||
      !allowedConcepts.includes(observation.conceptFSN)
    ) {
      return result;
    }

    let instruction = extractObservationValue(observation.value);

    if (
      observation.type === "Datetime" ||
      observation.concept?.dataType === "Datetime"
    ) {
      instruction = formatTime(
        observation.value,
        "YYYY-MM-DD HH:mm:ss",
        defaultDateTimeFormat12Hrs
      );
    }

    result.push({
      observationUuid: observation.uuid,
      orderUuid: observation.orderUuid ?? null,
      encounterUuid: observation.encounterUuid,
      observationDateTime: observation.observationDateTime,
      form: formName,
      instructionType: observation.concept.name,
      instruction,
      providerName: observation.providers?.[0]?.name ?? "",
    });

    return result;
  }, []);
};
