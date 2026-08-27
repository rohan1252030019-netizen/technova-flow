import { describe, it, expect } from "vitest";
import { firstActionableStep } from "@/lib/services/workflow-engine";
import { buildNotificationEmailHtml } from "@/lib/email";
import { getOAuthLoginUrl } from "@/lib/sso";
import { StepType, AssigneeType, Role } from "@/app/generated/prisma/client";

describe("Workflow Engine Step Resolution", () => {
  it("skips non-actionable processing steps and finds the first actionable step", () => {
    const steps = [
      {
        id: "step-1",
        workflowId: "wf-1",
        name: "Auto Notification",
        description: null,
        order: 0,
        stepType: StepType.PROCESSING,
        assigneeType: AssigneeType.ROLE,
        assignedRole: null,
        assignedDepartmentId: null,
        assignedUserId: null,
        requiresApproval: false,
        allowRejection: false,
        requiresComment: false,
        slaHours: null,
        escalationHours: null,
        escalationAssigneeType: null,
        escalationRole: null,
        escalationUserId: null,
        isFinal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "step-2",
        workflowId: "wf-1",
        name: "Manager Approval",
        description: null,
        order: 1,
        stepType: StepType.APPROVAL,
        assigneeType: AssigneeType.ROLE,
        assignedRole: Role.MANAGER,
        assignedDepartmentId: null,
        assignedUserId: null,
        requiresApproval: true,
        allowRejection: true,
        requiresComment: false,
        slaHours: 24,
        escalationHours: 12,
        escalationAssigneeType: null,
        escalationRole: null,
        escalationUserId: null,
        isFinal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "step-3",
        workflowId: "wf-1",
        name: "Finance Final Approval",
        description: null,
        order: 2,
        stepType: StepType.APPROVAL,
        assigneeType: AssigneeType.ROLE,
        assignedRole: Role.FINANCE,
        assignedDepartmentId: null,
        assignedUserId: null,
        requiresApproval: true,
        allowRejection: true,
        requiresComment: true,
        slaHours: 48,
        escalationHours: null,
        escalationAssigneeType: null,
        escalationRole: null,
        escalationUserId: null,
        isFinal: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const initialStep = firstActionableStep(steps, 0);
    expect(initialStep).toBeDefined();
    expect(initialStep?.id).toBe("step-2");
    expect(initialStep?.name).toBe("Manager Approval");

    const nextStep = firstActionableStep(steps, 1);
    expect(nextStep).toBeDefined();
    expect(nextStep?.id).toBe("step-3");
    expect(nextStep?.name).toBe("Finance Final Approval");

    const finalStep = firstActionableStep(steps, 2);
    expect(finalStep).toBeNull();
  });
});

describe("Email Notification Template Service", () => {
  it("renders branded HTML email with proper link and action parameters", () => {
    const html = buildNotificationEmailHtml({
      recipientName: "Rahul Kumar",
      type: "APPROVAL_REQUIRED",
      title: "Approval Required — REQ-2026-0042",
      body: "Rahul Kumar requested 3 days of Annual Leave.",
      link: "/requests/req-42",
    });

    expect(html).toContain("Hello Rahul Kumar");
    expect(html).toContain("Approval Required — REQ-2026-0042");
    expect(html).toContain("Rahul Kumar requested 3 days of Annual Leave.");
    expect(html).toContain("/requests/req-42");
    expect(html).toContain("TechNova Flow");
  });

  it("applies alert branding for escalations and SLA breaches", () => {
    const html = buildNotificationEmailHtml({
      type: "ESCALATION",
      title: "Urgent SLA Escalation",
      body: "Purchase order approval is 24 hours overdue.",
      link: "/requests/req-99",
    });

    expect(html).toContain("#dc2626"); // Red accent for escalation
    expect(html).toContain("Urgent SLA Escalation");
  });
});

describe("SSO OAuth URL Generation", () => {
  it("generates valid Google OAuth 2.0 authorization URL", () => {
    const url = getOAuthLoginUrl("google", "state-123");
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url).toContain("openid");
    expect(url).toContain("state=state-123");
  });

  it("generates valid GitHub OAuth authorization URL", () => {
    const url = getOAuthLoginUrl("github");
    expect(url).toContain("https://github.com/login/oauth/authorize");
    expect(url).toContain("user%3Aemail");
  });

  it("generates valid Microsoft Entra ID authorization URL", () => {
    const url = getOAuthLoginUrl("microsoft");
    expect(url).toContain("https://login.microsoftonline.com/");
    expect(url).toContain("oauth2/v2.0/authorize");
  });
});
