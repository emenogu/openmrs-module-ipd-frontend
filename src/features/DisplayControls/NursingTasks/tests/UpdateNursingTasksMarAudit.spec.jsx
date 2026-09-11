import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import React from "react";
import MockDate from "mockdate";

import UpdateNursingTasks from "../components/UpdateNursingTasks";
import {
  mockMedicationTasks,
  mockGroupSlotsByOrderId,
} from "./NursingTasksUtilsMockData";
import { IPDContext } from "../../../../context/IPDContext";
import { mockConfig } from "../../../../utils/CommonUtils";
import { mockUserWithAllRequiredPrivileges } from "../../../../utils/mockUserData";

const mockHandleAuditEvent = jest.fn();
const mockSaveAdministeredMedication = jest.fn();

jest.mock("../utils/NursingTasksUtils", () => {
  const actual = jest.requireActual("../utils/NursingTasksUtils");

  return {
    ...actual,
    saveAdministeredMedication: (...args) =>
      mockSaveAdministeredMedication(...args),
  };
});

describe("UpdateNursingTasks MAR audit dispatch", () => {
  const renderComponent = () =>
    render(
      <IPDContext.Provider
        value={{
          config: mockConfig,
          handleAuditEvent: mockHandleAuditEvent,
          currentUser: mockUserWithAllRequiredPrivileges,
        }}
      >
        <UpdateNursingTasks
          medicationTasks={[mockMedicationTasks[0]]}
          groupSlotsByOrderId={mockGroupSlotsByOrderId}
          updateNursingTasksSlider={jest.fn()}
          patientId="test_patient_uuid"
          providerId="test_provider_uuid"
          setShowNotification={jest.fn()}
          setNotificationMessage={jest.fn()}
          setNotificationStatus={jest.fn()}
        />
      </IPDContext.Provider>
    );

  const openAndConfirmSave = () => {
    const saveButtons = screen.getAllByText("Save");

    expect(saveButtons.length).toBeGreaterThanOrEqual(2);

    /*
     * Match the existing upstream component tests:
     * index 1 is the slider Save before the modal is open.
     */
    fireEvent.click(saveButtons[1]);

    const dialog = screen.getByRole("dialog");

    expect(
      within(dialog).getByText("Please confirm your nursing tasks")
    ).toBeTruthy();

    const modalSave = within(dialog).getByText("Save");

    fireEvent.click(modalSave);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    MockDate.set("2023-11-22T08:00:00Z");

    mockSaveAdministeredMedication.mockResolvedValue({
      status: 200,
      data: {
        message: "Medication task(s) updated successfully",
      },
    });
  });

  afterEach(() => {
    MockDate.reset();
  });

  it("audits a completed medication from the exact successfully submitted payload", async () => {
    const { container } = renderComponent();

    const toggle =
      container.querySelectorAll(".bx--toggle__switch")[0];

    expect(toggle).toBeTruthy();

    fireEvent.click(toggle);

    openAndConfirmSave();

    await waitFor(() => {
      expect(mockSaveAdministeredMedication).toHaveBeenCalledTimes(1);
    });

    const payload =
      mockSaveAdministeredMedication.mock.calls[0][0];

    expect(payload).toHaveLength(1);
    expect(payload[0].status).toBe("completed");

    await waitFor(() => {
      expect(mockHandleAuditEvent).toHaveBeenCalledTimes(1);
    });

    expect(mockHandleAuditEvent).toHaveBeenCalledWith(
      "ADMINISTER_MEDICATION_TASK"
    );
  });

  it("audits a skipped medication from the exact successfully submitted payload", async () => {
    const { container } = renderComponent();

    const overflow =
      container.querySelectorAll(".bx--overflow-menu")[0];

    expect(overflow).toBeTruthy();

    fireEvent.click(overflow);
    fireEvent.click(screen.getByText("Skip Drug"));

    const notes = container.querySelector(".bx--text-area");

    expect(notes).toBeTruthy();

    fireEvent.change(notes, {
      target: {
        value: "MAR audit regression skip",
      },
    });
    fireEvent.blur(notes);

    openAndConfirmSave();

    await waitFor(() => {
      expect(mockSaveAdministeredMedication).toHaveBeenCalledTimes(1);
    });

    const payload =
      mockSaveAdministeredMedication.mock.calls[0][0];

    expect(payload).toHaveLength(1);
    expect(payload[0].status).toBe("not-done");

    await waitFor(() => {
      expect(mockHandleAuditEvent).toHaveBeenCalledTimes(1);
    });

    expect(mockHandleAuditEvent).toHaveBeenCalledWith(
      "SKIP_SCHEDULED_MEDICATION_TASK"
    );
  });

  it("does not audit medication when persistence does not succeed", async () => {
    mockSaveAdministeredMedication.mockResolvedValueOnce({
      status: 500,
      data: {
        error: "Internal Server Error",
      },
    });

    const { container } = renderComponent();

    const toggle =
      container.querySelectorAll(".bx--toggle__switch")[0];

    expect(toggle).toBeTruthy();

    fireEvent.click(toggle);

    openAndConfirmSave();

    await waitFor(() => {
      expect(mockSaveAdministeredMedication).toHaveBeenCalledTimes(1);
    });

    expect(mockHandleAuditEvent).not.toHaveBeenCalled();
  });
});
