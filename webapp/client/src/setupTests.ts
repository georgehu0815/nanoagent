/**
 * Test setup file for Vitest
 * Runs before all tests
 */

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Extend expect matchers if needed
// Example: expect.extend({ ... });
