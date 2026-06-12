import { presetConfig, PRACTICE_OPS, RAMP_DEFAULT } from "../constants";

describe("presetConfig", () => {
    it("classic: all ops, fixed 10, ramp off", () => {
        const c = presetConfig("classic");
        expect(c.ops).toEqual(PRACTICE_OPS);
        expect(c.session).toEqual({ kind: "fixed", count: 10 });
        expect(c.ramp.enabled).toBe(false);
    });

    it("endless: ramp on with default thresholds, endless session", () => {
        const c = presetConfig("endless");
        expect(c.session.kind).toBe("endless");
        expect(c.ramp.enabled).toBe(true);
        expect(c.ramp.upStreak).toBe(RAMP_DEFAULT.upStreak);
        expect(c.ramp.downStreak).toBe(RAMP_DEFAULT.downStreak);
    });

    it("speed: timed 60s, fast 5s per-question timer", () => {
        const c = presetConfig("speed");
        expect(c.session).toEqual({ kind: "timed", seconds: 60 });
        expect(c.timer).toEqual({ enabled: true, perQuestionSeconds: 5 });
    });

    it("weakspot: flag set", () => {
        expect(presetConfig("weakspot").weakSpot).toBe(true);
    });

    it("returns a fresh object each call (no shared mutation)", () => {
        const a = presetConfig("classic");
        a.ops.push("compare");
        expect(presetConfig("classic").ops).toEqual(PRACTICE_OPS);
    });
});
