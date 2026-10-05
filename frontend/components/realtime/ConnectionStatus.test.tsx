import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConnectionStatus } from "./ConnectionStatus";

describe("ConnectionStatus", () => {
  it.each([
    ["connecting", "Connecting…"],
    ["connected", "Live"],
    ["reconnecting", "Reconnecting… showing last known data"],
    ["disconnected", "Offline — showing last known data"],
  ] as const)("renders accessible %s text", (status, label) => {
    render(<ConnectionStatus status={status} />);
    expect(screen.getByRole("status").textContent).toBe(label);
  });
});
