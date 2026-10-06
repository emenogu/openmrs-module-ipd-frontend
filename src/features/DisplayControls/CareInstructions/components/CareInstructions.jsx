import React, { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { FormattedMessage, useIntl } from "react-intl";
import {
  DataTableSkeleton,
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from "carbon-components-react";
import { IPDContext } from "../../../../context/IPDContext";
import { SliderContext } from "../../../../context/SliderContext";
import RefreshDisplayControl from "../../../../context/RefreshDisplayControl";
import {
  fetchCareInstructionsObs,
  fetchTasksByObservationUuids,
  getAcknowledgedObservationUuids,
  mapObservationsToInstructions,
} from "../utils/CareInstructionsUtils";
import { getDateTimeFromEpochTime } from "../../../../utils/DateTimeUtils";
import AddEmergencyTasks from "../../NursingTasks/components/AddEmergencyTasks";
import Notification from "../../../../components/Notification/Notification";
import { isUserPrivileged } from "../../../../utils/CommonUtils";
import { PRIVILEGE_CONSTANTS, componentKeys } from "../../../../constants";
import "../styles/CareInstructions.scss";

const EMPTY_FORM_CONCEPTS = [];
const SKELETON_ROW_COUNT = 3;

const CareInstructions = ({ patientId, config: sectionConfig = {} }) => {
  const intl = useIntl();
  const refreshDisplayControl = useContext(RefreshDisplayControl);
  const {
    visit,
    config: dashboardConfig,
    currentUser,
  } = useContext(IPDContext);
  const { isSliderOpen, updateSliderOpen, provider } =
    useContext(SliderContext);

  const {
    enable24HourTime = false,
    enableNurseAcknowledgement = false,
  } = dashboardConfig || {};
  const { formConcepts = EMPTY_FORM_CONCEPTS } = sectionConfig;

  const [instructions, setInstructions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedInstruction, setSelectedInstruction] = useState({
    observationUuid: null,
    orderUuid: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");

  const providerUuid = provider?.uuid;

  const allConceptNames = useMemo(
    () => [
      ...new Set(
        formConcepts.flatMap((formConcept) => formConcept.concepts || [])
      ),
    ],
    [formConcepts]
  );

  const acknowledgedObservationUuids = useMemo(
    () => getAcknowledgedObservationUuids(tasks),
    [tasks]
  );

  useEffect(() => {
    const loadInstructions = async () => {
      if (!visit || formConcepts.length === 0) {
        setInstructions([]);
        return;
      }

      setIsLoading(true);
      try {
        const observations = await fetchCareInstructionsObs(
          visit,
          allConceptNames
        );
        const mappedInstructions = mapObservationsToInstructions(
          observations,
          formConcepts
        )
          .map((instruction, index) => ({
            id: `${instruction.encounterUuid}-${instruction.observationUuid}-${index}`,
            ...instruction,
          }))
          .sort(
            (instructionA, instructionB) =>
              instructionB.observationDateTime -
              instructionA.observationDateTime
          );

        setInstructions(mappedInstructions);
      } finally {
        setIsLoading(false);
      }
    };

    loadInstructions();
  }, [visit, formConcepts, allConceptNames]);

  useEffect(() => {
    const loadTasks = async () => {
      if (!enableNurseAcknowledgement || instructions.length === 0) {
        setTasks([]);
        return;
      }

      const observationUuids = instructions
        .map((instruction) => instruction.observationUuid)
        .filter(Boolean);

      setIsTasksLoading(true);
      try {
        setTasks(await fetchTasksByObservationUuids(observationUuids));
      } finally {
        setIsTasksLoading(false);
      }
    };

    loadTasks();
  }, [enableNurseAcknowledgement, instructions]);

  const updateCareInstructionsTasksSlider = (value) => {
    updateSliderOpen((previous) => ({
      ...previous,
      careInstructionsTasks: value,
    }));
  };

  const openTaskPanel = (instruction) => {
    if (!providerUuid || isSliderOpen.careInstructionsTasks) return;

    setSelectedInstruction({
      observationUuid: instruction.observationUuid,
      orderUuid: instruction.orderUuid,
    });
    updateCareInstructionsTasksSlider(true);
  };

  const headers = [
    {
      key: "dateAndTime",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_DATE_AND_TIME_HEADER",
        defaultMessage: "Date and Time",
      }),
    },
    {
      key: "form",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_FORM_HEADER",
        defaultMessage: "Form",
      }),
    },
    {
      key: "instructionType",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_INSTRUCTION_TYPE_HEADER",
        defaultMessage: "Instruction Type",
      }),
    },
    {
      key: "instruction",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_INSTRUCTION_HEADER",
        defaultMessage: "Instruction",
      }),
    },
    {
      key: "providerName",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_PROVIDER_NAME_HEADER",
        defaultMessage: "Provider Name",
      }),
    },
    {
      key: "action",
      header: intl.formatMessage({
        id: "CARE_INSTRUCTIONS_ACTION_HEADER",
        defaultMessage: "Action",
      }),
    },
  ];

  const renderRows = (rows) => {
    if (rows.length === 0) {
      return (
        <div className="empty-state-message">
          <FormattedMessage
            id="NO_CARE_INSTRUCTIONS_MESSAGE"
            defaultMessage="No care instructions are available for the patient"
          />
        </div>
      );
    }

    return (
      <Table useZebraStyles>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableHeader key={header.key}>{header.header}</TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                {getDateTimeFromEpochTime(
                  row.observationDateTime,
                  enable24HourTime
                )}
              </TableCell>
              <TableCell>{row.form}</TableCell>
              <TableCell>{row.instructionType}</TableCell>
              <TableCell className="instruction-cell">
                {row.instruction}
              </TableCell>
              <TableCell>{row.providerName}</TableCell>
              <TableCell className="action-cell">
                {isUserPrivileged(
                  currentUser,
                  PRIVILEGE_CONSTANTS.ADD_TASKS
                ) && (
                  <Link onClick={() => openTaskPanel(row)}>
                    <FormattedMessage
                      id="ADD_TASK"
                      defaultMessage="Add Task"
                    />
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading || isTasksLoading) {
    return (
      <DataTableSkeleton
        rowCount={SKELETON_ROW_COUNT}
        columnCount={headers.length}
      />
    );
  }

  const notAcknowledgedInstructions = instructions.filter(
    (instruction) =>
      !acknowledgedObservationUuids.has(instruction.observationUuid)
  );
  const acknowledgedInstructions = instructions.filter((instruction) =>
    acknowledgedObservationUuids.has(instruction.observationUuid)
  );

  return (
    <div className="care-instructions-display-control">
      {enableNurseAcknowledgement ? (
        <Tabs>
          <Tab
            id="notAcknowledged"
            label={intl.formatMessage({
              id: "NOT_ACKNOWLEDGED_TAB",
              defaultMessage: "Not Acknowledged",
            })}
          >
            {renderRows(notAcknowledgedInstructions)}
          </Tab>
          <Tab
            id="acknowledged"
            label={intl.formatMessage({
              id: "ACKNOWLEDGED_TAB",
              defaultMessage: "Acknowledged",
            })}
          >
            {renderRows(acknowledgedInstructions)}
          </Tab>
        </Tabs>
      ) : (
        renderRows(instructions)
      )}

      {isSliderOpen.careInstructionsTasks && (
        <AddEmergencyTasks
          patientId={patientId}
          providerId={providerUuid}
          updateEmergencyTasksSlider={updateCareInstructionsTasksSlider}
          setShowNotification={setShowNotification}
          setNotificationMessage={setNotificationMessage}
          setNotificationStatus={setNotificationStatus}
          hideMedicationTab={true}
          observationUuid={selectedInstruction.observationUuid}
          orderUuid={selectedInstruction.orderUuid}
        />
      )}

      {showNotification && (
        <Notification
          hostData={{
            notificationKind: notificationStatus,
            defaultMessage: notificationMessage,
          }}
          hostApi={{
            onClose: () => {
              setShowNotification(false);
              refreshDisplayControl([
                componentKeys.NURSING_TASKS,
                componentKeys.CARE_INSTRUCTIONS,
              ]);
            },
          }}
        />
      )}
    </div>
  );
};

CareInstructions.propTypes = {
  patientId: PropTypes.string.isRequired,
  config: PropTypes.shape({
    formConcepts: PropTypes.arrayOf(
      PropTypes.shape({
        formName: PropTypes.string.isRequired,
        concepts: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ),
  }),
};

export default CareInstructions;
