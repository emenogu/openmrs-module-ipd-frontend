import axios from "axios";
import {
  fetchTasksByObservationUuids,
  getAcknowledgedObservationUuids,
  mapObservationsToInstructions,
} from "./CareInstructionsUtils";

jest.mock("axios");

describe("CareInstructionsUtils", () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  it("queries FHIR Task focus with OR semantics and maps observation UUIDs", async () => {
    axios.get.mockResolvedValue({
      data: {
        entry: [
          {
            resource: {
              id: "task-1",
              focus: { reference: "Observation/obs-1" },
              status: "requested",
            },
          },
        ],
      },
    });

    const result = await fetchTasksByObservationUuids([
      "obs-1",
      "obs-2",
      "obs-1",
    ]);

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining(
        "/Task?focus=Observation/obs-1,Observation/obs-2&_count=500"
      ),
      { withCredentials: true }
    );
    expect(result).toEqual([
      {
        uuid: "task-1",
        observationUuid: "obs-1",
        status: "requested",
      },
    ]);
  });

  it("builds the acknowledged observation UUID set from task focus", () => {
    const result = getAcknowledgedObservationUuids([
      { observationUuid: "obs-1" },
      { observationUuid: "obs-2" },
      { observationUuid: null },
    ]);

    expect(result).toEqual(new Set(["obs-1", "obs-2"]));
  });

  it("preserves observation and ServiceRequest linkage in mapped instructions", () => {
    const observations = [
      {
        uuid: "obs-1",
        orderUuid: "order-1",
        encounterUuid: "enc-1",
        observationDateTime: 1000,
        formFieldPath: "General Care Instructions.1/0-0",
        conceptFSN: "Activity",
        concept: { name: "Activity", dataType: "Text" },
        value: "Bed rest",
        providers: [{ name: "Dr Example" }],
      },
    ];

    const formConcepts = [
      {
        formName: "General Care Instructions",
        concepts: ["Activity"],
      },
    ];

    expect(
      mapObservationsToInstructions(observations, formConcepts)
    ).toEqual([
      {
        observationUuid: "obs-1",
        orderUuid: "order-1",
        encounterUuid: "enc-1",
        observationDateTime: 1000,
        form: "General Care Instructions",
        instructionType: "Activity",
        instruction: "Bed rest",
        providerName: "Dr Example",
      },
    ]);
  });
});
