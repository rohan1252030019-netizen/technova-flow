import { describe, it, expect } from "vitest";
import {
  stepRequestStatus,
  isActionableStep,
  firstActionableStep,
  resolveStepAssignee,
} from "@/lib/services/workflow-engine";
import type { WorkflowStep } from "@/app/generated/prisma/client";

function step(partial: Partial<WorkflowStep>): WorkflowStep {
  return {
    id: "s1",
    workflowId: "w1",
    name: "Step",
    description: null,
    order: 0,
    stepType: "APPROVAL",
    assigneeType: "ROLE",
    assignedRole: null,
    assignedDepartmentId: null,
    assignedUserId: null,
    requiresApproval: true,
    allowRejection: true,
    requiresComment: false,
    slaHours: null,
    escalationHours: null,
    escalationAssigneeType: null,
    escalationRole: null,
    escalationUserId: null,
    isFinal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe("stepRequestStatus", () => {
  it("returns PENDING_APPROVAL for approval steps", () => {
    expect(stepRequestStatus(step({ stepType: "APPROVAL" }))).toBe("PENDING_APPROVAL");
  });
  it("returns IN_PROGRESS for processing and task steps", () => {
    expect(stepRequestStatus(step({ stepType: "PROCESSING" }))).toBe("IN_PROGRESS");
    expect(stepRequestStatus(step({ stepType: "TASK" }))).toBe("IN_PROGRESS");
  });
});

describe("isActionableStep", () => {
  it("treats approval steps as actionable", () => {
    expect(isActionableStep(step({ stepType: "APPROVAL", assignedRole: "MANAGER" }))).toBe(true);
  });
  it("treats task steps as actionable even without assignee config", () => {
    expect(isActionableStep(step({ stepType: "TASK", assignedUserId: null }))).toBe(true);
  });
  it("treats processing steps without assignee as non-actionable", () => {
    expect(isActionableStep(step({ stepType: "PROCESSING", assignedUserId: null, assignedRole: null, assignedDepartmentId: null }))).toBe(false);
  });
  it("treats processing steps with an assignee as actionable", () => {
    expect(isActionableStep(step({ stepType: "PROCESSING", assignedRole: "FINANCE" }))).toBe(true);
    expect(isActionableStep(step({ stepType: "PROCESSING", assignedUserId: "u-1" }))).toBe(true);
    expect(isActionableStep(step({ stepType: "PROCESSING", assignedDepartmentId: "dept-it" }))).toBe(true);
  });
});

describe("firstActionableStep", () => {
  const submit = step({ id: "s0", order: 0, name: "Submit", stepType: "PROCESSING", assignedUserId: null, assignedRole: null, assignedDepartmentId: null });
  const manager = step({ id: "s1", order: 1, name: "Manager Approval", stepType: "APPROVAL", assignedRole: "MANAGER" });
  const finance = step({ id: "s2", order: 2, name: "Finance Approval", stepType: "APPROVAL", assignedRole: "FINANCE" });
  const final = step({ id: "s3", order: 3, name: "Done", stepType: "PROCESSING", isFinal: true, assignedUserId: null, assignedRole: null, assignedDepartmentId: null });

  it("skips non-actionable steps at the start", () => {
    expect(firstActionableStep([submit, manager, finance, final])?.id).toBe("s1");
  });
  it("finds the next actionable step after a given order", () => {
    expect(firstActionableStep([submit, manager, finance, final], 1)?.id).toBe("s2");
  });
  it("returns null when only non-actionable steps remain", () => {
    expect(firstActionableStep([submit, manager, final], 1)).toBeNull();
  });
  it("returns null for an empty workflow", () => {
    expect(firstActionableStep([])).toBeNull();
  });
  it("completes a workflow whose steps are all non-actionable", () => {
    expect(firstActionableStep([submit, final])).toBeNull();
  });
});

describe("resolveStepAssignee", () => {
  it("resolves a user-assigned step to its user", () => {
    expect(resolveStepAssignee(step({ assigneeType: "USER", assignedUserId: "u-42" }))).toBe("u-42");
  });
  it("returns null for role- or department-assigned steps", () => {
    expect(resolveStepAssignee(step({ assigneeType: "ROLE", assignedRole: "MANAGER" }))).toBeNull();
    expect(resolveStepAssignee(step({ assigneeType: "DEPARTMENT", assignedDepartmentId: "dept-it" }))).toBeNull();
  });
  it("returns null when no step is given", () => {
    expect(resolveStepAssignee(null)).toBeNull();
  });
});