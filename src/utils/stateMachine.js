class EncounterStateMachine {
  static transitions = {
    TRIAGE: ["ONGOING"],
    ONGOING: ["OBSERVATION", "DISPOSITION"],
    OBSERVATION: ["ONGOING", "DISPOSITION"],
    DISPOSITION: ["DISCHARGED", "ADMITTED"],
  };

  static validateTransition(currentStatus, newStatus) {
    const allowed = this.transitions[currentStatus];

    if (currentStatus === null && newStatus === "TRIAGE") {
      return true;
    }

    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
    }

    // Final states cannot be changed
    if (["DISCHARGED", "ADMITTED"].includes(currentStatus)) {
      throw new Error(`Encounter in ${currentStatus} state cannot be modified`);
    }

    return true;
  }
}

module.exports = EncounterStateMachine;
