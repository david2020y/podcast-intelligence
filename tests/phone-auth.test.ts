import { describe, expect, it } from "vitest";
import { isValidChinesePhone, phoneToSyntheticEmail } from "@/lib/auth/phone";

describe("isValidChinesePhone", () => {
  it("accepts valid mainland mobile numbers", () => {
    expect(isValidChinesePhone("13800001111")).toBe(true);
    expect(isValidChinesePhone("19912345678")).toBe(true);
  });

  it("rejects malformed numbers", () => {
    expect(isValidChinesePhone("12800001111")).toBe(false); // second digit must be 3-9
    expect(isValidChinesePhone("1380000111")).toBe(false); // too short
    expect(isValidChinesePhone("138000011112")).toBe(false); // too long
    expect(isValidChinesePhone("+8613800001111")).toBe(false);
    expect(isValidChinesePhone("abcdefghijk")).toBe(false);
  });
});

describe("phoneToSyntheticEmail", () => {
  it("derives a deterministic, distinct email per phone number", () => {
    expect(phoneToSyntheticEmail("13800001111")).toBe("p13800001111@phone.podcast-intel.local");
    expect(phoneToSyntheticEmail("13800001111")).toBe(phoneToSyntheticEmail("13800001111"));
    expect(phoneToSyntheticEmail("13800001112")).not.toBe(phoneToSyntheticEmail("13800001111"));
  });
});
