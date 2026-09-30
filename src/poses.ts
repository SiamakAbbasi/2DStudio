import { basePose, clonePose } from "./animation";
import type { JointName, Pose, V } from "./types";
import { dancePoseEntries } from "./danceData";

type Edit = Partial<Record<JointName, V>>;
export type PoseCategory =
  | "Guard"
  | "Stance"
  | "Movement"
  | "Jump"
  | "Punch"
  | "Kick"
  | "Defense"
  | "Reaction"
  | "Ground"
  | "Acrobatic"
  | "Dance"
  | "Sword";
export interface PoseEntry {
  id: string;
  name: string;
  category: PoseCategory;
  pose: Pose;
  tags: string[];
  style?: string;
}
const make = (edit: Edit = {}, shift = { x: 0, y: 0 }) => {
  const p = basePose();
  for (const j in p) {
    p[j as JointName].x += shift.x;
    p[j as JointName].y += shift.y;
  }
  for (const [j, v] of Object.entries(edit)) p[j as JointName] = { ...v! };
  p.root = {
    x: (p.leftHip.x + p.rightHip.x) / 2,
    y: (p.leftHip.y + p.rightHip.y) / 2,
  };
  return p;
};
const from = (src: Pose, edit: Edit = {}, dx = 0, dy = 0) => {
  const p = clonePose(src);
  for (const j in p) {
    p[j as JointName].x += dx;
    p[j as JointName].y += dy;
  }
  for (const [j, v] of Object.entries(edit)) p[j as JointName] = { ...v! };
  p.root = {
    x: (p.leftHip.x + p.rightHip.x) / 2,
    y: (p.leftHip.y + p.rightHip.y) / 2,
  };
  return p;
};
const guard = make({
  torso: { x: 370, y: 625 },
  neck: { x: 377, y: 565 },
  head: { x: 380, y: 525 },
  leftShoulder: { x: 350, y: 570 },
  leftElbow: { x: 325, y: 610 },
  leftWrist: { x: 365, y: 555 },
  rightShoulder: { x: 405, y: 570 },
  rightElbow: { x: 430, y: 610 },
  rightWrist: { x: 400, y: 535 },
  leftHip: { x: 338, y: 715 },
  rightHip: { x: 382, y: 715 },
  leftKnee: { x: 310, y: 805 },
  leftAnkle: { x: 275, y: 900 },
  rightKnee: { x: 425, y: 800 },
  rightAnkle: { x: 455, y: 895 },
});
const crouch = make({
  torso: { x: 360, y: 700 },
  neck: { x: 365, y: 650 },
  head: { x: 370, y: 610 },
  leftHip: { x: 330, y: 775 },
  rightHip: { x: 390, y: 775 },
  leftKnee: { x: 275, y: 825 },
  leftAnkle: { x: 235, y: 900 },
  rightKnee: { x: 450, y: 825 },
  rightAnkle: { x: 490, y: 900 },
  leftShoulder: { x: 335, y: 655 },
  rightShoulder: { x: 395, y: 655 },
  leftElbow: { x: 315, y: 710 },
  rightElbow: { x: 425, y: 700 },
  leftWrist: { x: 350, y: 690 },
  rightWrist: { x: 390, y: 665 },
});
const chamber = (kind: string) =>
  from(
    guard,
    kind === "front"
      ? {
          rightHip: { x: 385, y: 710 },
          rightKnee: { x: 470, y: 690 },
          rightAnkle: { x: 475, y: 760 },
          torso: { x: 345, y: 625 },
          head: { x: 350, y: 525 },
        }
      : kind === "side"
        ? {
            rightHip: { x: 385, y: 710 },
            rightKnee: { x: 455, y: 650 },
            rightAnkle: { x: 405, y: 640 },
            torso: { x: 325, y: 625 },
            neck: { x: 320, y: 565 },
            head: { x: 315, y: 525 },
          }
        : kind === "roundhouse"
          ? {
              rightHip: { x: 390, y: 705 },
              rightKnee: { x: 470, y: 650 },
              rightAnkle: { x: 430, y: 620 },
              torso: { x: 330, y: 625 },
              leftWrist: { x: 300, y: 585 },
            }
          : {
              rightHip: { x: 390, y: 710 },
              rightKnee: { x: 445, y: 735 },
              rightAnkle: { x: 410, y: 790 },
              torso: { x: 330, y: 620 },
              head: { x: 320, y: 520 },
            },
  );
const kick = (kind: string, high = false) =>
  from(
    guard,
    kind === "front"
      ? {
          rightHip: { x: 385, y: 710 },
          rightKnee: { x: 475, y: 700 },
          rightAnkle: { x: high ? 600 : 570, y: high ? 560 : 680 },
          torso: { x: 330, y: 625 },
          head: { x: 325, y: 525 },
        }
      : kind === "side"
        ? {
            rightHip: { x: 390, y: 705 },
            rightKnee: { x: 480, y: 675 },
            rightAnkle: { x: high ? 625 : 610, y: high ? 550 : 650 },
            torso: { x: 320, y: 630 },
            neck: { x: 315, y: 570 },
            head: { x: 305, y: 530 },
          }
        : kind === "roundhouse"
          ? {
              rightHip: { x: 390, y: 705 },
              rightKnee: { x: 490, y: 630 },
              rightAnkle: { x: high ? 630 : 610, y: high ? 535 : 610 },
              torso: { x: 315, y: 625 },
              leftWrist: { x: 285, y: 600 },
            }
          : {
              rightHip: { x: 385, y: 710 },
              rightKnee: { x: 485, y: 720 },
              rightAnkle: { x: 610, y: 700 },
              torso: { x: 315, y: 620 },
              head: { x: 300, y: 520 },
            },
  );
const punch = (kind: string) =>
  from(
    guard,
    kind === "hook"
      ? {
          torso: { x: 390, y: 625 },
          neck: { x: 400, y: 565 },
          head: { x: 405, y: 525 },
          rightShoulder: { x: 425, y: 570 },
          rightElbow: { x: 500, y: 555 },
          rightWrist: { x: 485, y: 520 },
          leftWrist: { x: 360, y: 550 },
          leftHip: { x: 350, y: 715 },
          rightHip: { x: 395, y: 710 },
        }
      : kind === "uppercut"
        ? {
            torso: { x: 385, y: 650 },
            neck: { x: 395, y: 590 },
            head: { x: 400, y: 550 },
            rightShoulder: { x: 420, y: 590 },
            rightElbow: { x: 455, y: 545 },
            rightWrist: { x: 470, y: 485 },
            leftKnee: { x: 300, y: 825 },
            rightKnee: { x: 430, y: 815 },
          }
        : {
            torso: { x: 390, y: 625 },
            neck: { x: 405, y: 565 },
            head: { x: 410, y: 525 },
            rightShoulder: { x: 435, y: 570 },
            rightElbow: { x: 515, y: 555 },
            rightWrist: { x: 600, y: 545 },
            leftWrist: { x: 370, y: 545 },
            leftHip: { x: 350, y: 715 },
            rightHip: { x: 405, y: 710 },
          },
  );
const reaction = from(guard, {
  torso: { x: 310, y: 640 },
  neck: { x: 285, y: 575 },
  head: { x: 265, y: 530 },
  leftShoulder: { x: 275, y: 585 },
  rightShoulder: { x: 320, y: 580 },
  leftElbow: { x: 240, y: 625 },
  rightElbow: { x: 355, y: 620 },
  leftWrist: { x: 215, y: 665 },
  rightWrist: { x: 390, y: 660 },
  leftHip: { x: 330, y: 720 },
  rightHip: { x: 380, y: 720 },
});

const entries: PoseEntry[] = [];
const add = (category: PoseCategory, items: Record<string, Pose>) =>
  Object.entries(items).forEach(([id, pose]) =>
    entries.push({
      id,
      name: id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      category,
      pose,
      tags: [category.toLowerCase(), ...id.split("_")],
    }),
  );
add("Guard", {
  neutral_stand: basePose(),
  idle_relaxed: make({
    leftElbow: { x: 330, y: 650 },
    leftWrist: { x: 325, y: 710 },
    rightElbow: { x: 395, y: 650 },
    rightWrist: { x: 400, y: 710 },
  }),
  fight_guard: guard,
  high_guard: from(guard, {
    leftWrist: { x: 355, y: 490 },
    rightWrist: { x: 410, y: 485 },
    leftElbow: { x: 320, y: 555 },
    rightElbow: { x: 445, y: 550 },
  }),
  low_guard: from(guard, {
    leftWrist: { x: 355, y: 660 },
    rightWrist: { x: 420, y: 650 },
  }),
  side_guard: from(guard, {
    torso: { x: 350, y: 625 },
    leftWrist: { x: 315, y: 560 },
    rightWrist: { x: 440, y: 560 },
  }),
  compact_guard: from(guard, {
    leftWrist: { x: 365, y: 535 },
    rightWrist: { x: 395, y: 525 },
    leftElbow: { x: 345, y: 595 },
    rightElbow: { x: 420, y: 590 },
  }),
  long_guard: from(guard, {
    leftElbow: { x: 430, y: 560 },
    leftWrist: { x: 500, y: 550 },
  }),
});
add("Stance", {
  horse_stance: make({
    torso: { x: 360, y: 650 },
    neck: { x: 360, y: 590 },
    head: { x: 360, y: 550 },
    leftHip: { x: 325, y: 745 },
    rightHip: { x: 395, y: 745 },
    leftKnee: { x: 250, y: 810 },
    rightKnee: { x: 470, y: 810 },
    leftAnkle: { x: 210, y: 900 },
    rightAnkle: { x: 510, y: 900 },
    leftWrist: { x: 340, y: 595 },
    rightWrist: { x: 380, y: 595 },
  }),
  bow_stance: from(guard, {
    leftHip: { x: 335, y: 720 },
    rightHip: { x: 390, y: 710 },
    leftKnee: { x: 430, y: 795 },
    leftAnkle: { x: 500, y: 900 },
    rightKnee: { x: 300, y: 790 },
    rightAnkle: { x: 220, y: 900 },
    torso: { x: 390, y: 625 },
  }),
  front_stance: from(guard, {
    leftKnee: { x: 440, y: 805 },
    leftAnkle: { x: 510, y: 900 },
    rightKnee: { x: 310, y: 805 },
    rightAnkle: { x: 250, y: 900 },
  }),
  back_stance: from(guard, {
    leftHip: { x: 320, y: 720 },
    rightHip: { x: 370, y: 720 },
    leftKnee: { x: 285, y: 805 },
    leftAnkle: { x: 250, y: 900 },
    rightKnee: { x: 440, y: 810 },
    rightAnkle: { x: 500, y: 900 },
    torso: { x: 335, y: 625 },
  }),
  cat_stance: from(guard, {
    leftHip: { x: 335, y: 730 },
    rightHip: { x: 385, y: 720 },
    leftKnee: { x: 320, y: 820 },
    leftAnkle: { x: 300, y: 900 },
    rightKnee: { x: 445, y: 790 },
    rightAnkle: { x: 470, y: 870 },
  }),
  empty_stance: from(guard, {
    rightKnee: { x: 465, y: 780 },
    rightAnkle: { x: 500, y: 860 },
  }),
  cross_stance: from(guard, {
    leftKnee: { x: 410, y: 810 },
    leftAnkle: { x: 430, y: 900 },
    rightKnee: { x: 335, y: 805 },
    rightAnkle: { x: 300, y: 900 },
  }),
  drop_stance: from(crouch, {
    leftAnkle: { x: 180, y: 900 },
    rightAnkle: { x: 510, y: 900 },
  }),
  low_side_stance: from(crouch, {
    leftKnee: { x: 230, y: 835 },
    leftAnkle: { x: 150, y: 900 },
    rightKnee: { x: 470, y: 790 },
    rightAnkle: { x: 560, y: 900 },
  }),
  deep_lunge: from(crouch, {
    leftKnee: { x: 485, y: 820 },
    leftAnkle: { x: 560, y: 900 },
    rightKnee: { x: 270, y: 850 },
    rightAnkle: { x: 190, y: 900 },
  }),
  crane_stance: from(guard, {
    rightKnee: { x: 455, y: 685 },
    rightAnkle: { x: 420, y: 740 },
    leftWrist: { x: 300, y: 520 },
    rightWrist: { x: 465, y: 520 },
  }),
  golden_rooster_stance: from(guard, {
    rightKnee: { x: 450, y: 670 },
    rightAnkle: { x: 420, y: 730 },
    leftWrist: { x: 330, y: 490 },
    rightWrist: { x: 420, y: 480 },
  }),
  kneeling_stance: from(crouch, {
    leftKnee: { x: 320, y: 875 },
    leftAnkle: { x: 255, y: 900 },
    rightKnee: { x: 440, y: 815 },
  }),
  crouch,
  one_leg_balance: from(guard, {
    rightKnee: { x: 430, y: 700 },
    rightAnkle: { x: 430, y: 770 },
  }),
});
add("Movement", {
  step_forward_start: from(guard, {
    rightKnee: { x: 430, y: 785 },
    rightAnkle: { x: 500, y: 880 },
  }),
  step_forward_contact: from(guard, {
    leftKnee: { x: 430, y: 790 },
    leftAnkle: { x: 510, y: 900 },
  }),
  step_backward_start: from(guard, {
    leftKnee: { x: 300, y: 790 },
    leftAnkle: { x: 235, y: 875 },
  }),
  step_backward_contact: from(guard, {
    rightKnee: { x: 300, y: 800 },
    rightAnkle: { x: 230, y: 900 },
  }),
  sidestep_left: from(guard, { torso: { x: 330, y: 625 } }, -45),
  sidestep_right: from(guard, { torso: { x: 390, y: 625 } }, 45),
  dash_anticipation: from(crouch, {
    torso: { x: 410, y: 690 },
    head: { x: 430, y: 595 },
    leftWrist: { x: 300, y: 690 },
    rightWrist: { x: 460, y: 625 },
  }),
  dash_forward: from(guard, {
    torso: { x: 420, y: 640 },
    head: { x: 450, y: 545 },
    leftAnkle: { x: 220, y: 900 },
    rightAnkle: { x: 490, y: 860 },
  }),
  dash_stop: from(crouch, { torso: { x: 330, y: 680 } }),
  dash_backward: from(guard, {
    torso: { x: 300, y: 620 },
    head: { x: 270, y: 520 },
  }),
  dash_backward_stop: crouch,
  run_start: from(guard, { torso: { x: 410, y: 630 } }),
  run_stride_a: from(guard, {
    leftKnee: { x: 430, y: 760 },
    leftAnkle: { x: 500, y: 820 },
    rightAnkle: { x: 230, y: 900 },
  }),
  run_stride_b: from(guard, {
    rightKnee: { x: 430, y: 760 },
    rightAnkle: { x: 500, y: 820 },
    leftAnkle: { x: 230, y: 900 },
  }),
  run_stop: crouch,
  turn_anticipation: from(guard, { torso: { x: 330, y: 625 } }),
  turn_mid: from(guard, {
    leftWrist: { x: 440, y: 560 },
    rightWrist: { x: 310, y: 560 },
  }),
  turn_complete: mirroredLocal(guard),
  spin_start: from(guard, { torso: { x: 330, y: 625 } }),
  spin_mid: from(guard, {
    leftWrist: { x: 470, y: 560 },
    rightWrist: { x: 250, y: 570 },
  }),
  spin_end: guard,
});
add("Jump", {
  jump_anticipation: crouch,
  jump_takeoff: from(guard, {
    leftAnkle: { x: 320, y: 880 },
    rightAnkle: { x: 400, y: 880 },
    leftWrist: { x: 320, y: 500 },
    rightWrist: { x: 420, y: 500 },
  }),
  jump_rising: from(
    guard,
    {
      leftKnee: { x: 330, y: 750 },
      rightKnee: { x: 410, y: 750 },
      leftAnkle: { x: 300, y: 810 },
      rightAnkle: { x: 450, y: 805 },
    },
    0,
    -120,
  ),
  jump_apex: from(
    guard,
    {
      leftKnee: { x: 310, y: 745 },
      rightKnee: { x: 430, y: 740 },
      leftAnkle: { x: 270, y: 790 },
      rightAnkle: { x: 475, y: 780 },
    },
    0,
    -230,
  ),
  jump_falling: from(
    guard,
    { leftKnee: { x: 325, y: 760 }, rightKnee: { x: 420, y: 760 } },
    0,
    -120,
  ),
  jump_land: crouch,
  jump_land_deep: from(crouch, {
    torso: { x: 360, y: 735 },
    head: { x: 370, y: 645 },
  }),
});
const ant = from(guard, {
  rightElbow: { x: 330, y: 610 },
  rightWrist: { x: 300, y: 645 },
  torso: { x: 345, y: 625 },
  head: { x: 345, y: 525 },
});
add("Punch", {
  jab_anticipation: from(guard, {
    leftElbow: { x: 330, y: 610 },
    leftWrist: { x: 315, y: 625 },
  }),
  jab_extension: from(guard, {
    leftElbow: { x: 480, y: 555 },
    leftWrist: { x: 570, y: 550 },
    torso: { x: 385, y: 625 },
  }),
  straight_punch_anticipation: ant,
  straight_punch_extension: punch("straight"),
  cross_anticipation: ant,
  cross_extension: punch("straight"),
  reverse_punch_anticipation: ant,
  reverse_punch_extension: punch("straight"),
  hook_anticipation: from(ant, {
    rightElbow: { x: 350, y: 535 },
    rightWrist: { x: 320, y: 520 },
  }),
  hook_extension: punch("hook"),
  uppercut_anticipation: from(crouch, {
    rightWrist: { x: 360, y: 680 },
    rightElbow: { x: 400, y: 690 },
  }),
  uppercut_extension: punch("uppercut"),
  overhand_anticipation: from(guard, {
    rightWrist: { x: 390, y: 470 },
    rightElbow: { x: 450, y: 520 },
  }),
  overhand_extension: from(punch("straight"), {
    rightWrist: { x: 565, y: 590 },
    rightElbow: { x: 500, y: 520 },
  }),
  backfist_anticipation: ant,
  backfist_extension: from(punch("straight"), {
    rightWrist: { x: 560, y: 525 },
  }),
  hammerfist_anticipation: from(guard, {
    rightWrist: { x: 410, y: 455 },
    rightElbow: { x: 450, y: 520 },
  }),
  hammerfist_extension: from(guard, {
    rightWrist: { x: 520, y: 650 },
    rightElbow: { x: 480, y: 570 },
  }),
  double_punch_extension: from(punch("straight"), {
    leftElbow: { x: 490, y: 575 },
    leftWrist: { x: 570, y: 570 },
  }),
  palm_strike_anticipation: ant,
  palm_strike_extension: punch("straight"),
  knife_hand_anticipation: ant,
  knife_hand_extension: from(punch("straight"), {
    rightWrist: { x: 585, y: 530 },
  }),
  spear_hand_extension: punch("straight"),
  elbow_horizontal_anticipation: ant,
  elbow_horizontal_extension: from(guard, {
    rightElbow: { x: 505, y: 555 },
    rightWrist: { x: 440, y: 535 },
    torso: { x: 400, y: 625 },
  }),
  elbow_up_anticipation: ant,
  elbow_up_extension: from(guard, {
    rightElbow: { x: 440, y: 500 },
    rightWrist: { x: 410, y: 550 },
  }),
});
add("Kick", {
  kick_chamber_front: chamber("front"),
  kick_chamber_side: chamber("side"),
  kick_chamber_roundhouse: chamber("roundhouse"),
  kick_chamber_back: chamber("back"),
  kick_chamber_hook: chamber("side"),
  kick_chamber_crescent: chamber("roundhouse"),
  front_kick_extension: kick("front"),
  front_kick_high_extension: kick("front", true),
  side_kick_extension: kick("side"),
  side_kick_high_extension: kick("side", true),
  roundhouse_kick_extension: kick("roundhouse"),
  roundhouse_high_extension: kick("roundhouse", true),
  back_kick_extension: kick("back"),
  low_kick_extension: from(kick("roundhouse"), {
    rightAnkle: { x: 590, y: 735 },
  }),
  push_kick_extension: kick("front"),
  axe_kick_apex: from(kick("front", true), {
    rightAnkle: { x: 520, y: 410 },
    rightKnee: { x: 470, y: 560 },
  }),
  axe_kick_down: from(kick("front"), { rightAnkle: { x: 560, y: 760 } }),
  hook_kick_extension: from(kick("side"), {
    rightKnee: { x: 520, y: 640 },
    rightAnkle: { x: 610, y: 590 },
  }),
  crescent_kick_inside: kick("roundhouse", true),
  crescent_kick_outside: from(kick("roundhouse", true), {
    rightAnkle: { x: 580, y: 470 },
  }),
  spinning_kick_chamber: chamber("back"),
  spinning_back_kick_extension: kick("back"),
  spinning_hook_kick_extension: from(kick("back"), {
    rightAnkle: { x: 620, y: 575 },
  }),
  jump_kick_chamber: from(chamber("front"), {}, 0, -150),
  jump_front_kick_extension: from(kick("front"), {}, 0, -160),
  jump_side_kick_extension: from(kick("side"), {}, 0, -160),
  jump_roundhouse_extension: from(kick("roundhouse"), {}, 0, -160),
  flying_kick_extension: from(
    kick("side"),
    { leftKnee: { x: 310, y: 730 }, leftAnkle: { x: 270, y: 770 } },
    0,
    -180,
  ),
  sweep_anticipation: crouch,
  sweep_mid: from(crouch, {
    rightKnee: { x: 455, y: 820 },
    rightAnkle: { x: 550, y: 870 },
  }),
  sweep_extension: from(crouch, {
    rightKnee: { x: 500, y: 840 },
    rightAnkle: { x: 640, y: 880 },
  }),
  low_sweep_anticipation: crouch,
  low_sweep_extension: from(crouch, { rightAnkle: { x: 620, y: 895 } }),
  sliding_attack_start: crouch,
  sliding_attack_extension: from(kick("side"), {}, 40, 80),
});
add("Defense", {
  block_high: from(guard, {
    leftWrist: { x: 350, y: 455 },
    rightWrist: { x: 410, y: 460 },
    leftElbow: { x: 320, y: 535 },
    rightElbow: { x: 450, y: 535 },
  }),
  block_low: from(guard, {
    leftWrist: { x: 350, y: 690 },
    rightWrist: { x: 420, y: 680 },
  }),
  block_inside: from(guard, {
    rightWrist: { x: 340, y: 555 },
    rightElbow: { x: 430, y: 570 },
  }),
  block_outside: from(guard, {
    rightWrist: { x: 480, y: 545 },
    rightElbow: { x: 425, y: 590 },
  }),
  cross_block_high: from(guard, {
    leftWrist: { x: 390, y: 475 },
    rightWrist: { x: 365, y: 475 },
  }),
  cross_block_low: from(guard, {
    leftWrist: { x: 390, y: 675 },
    rightWrist: { x: 365, y: 675 },
  }),
  guard_body: guard,
  cover_head: from(guard, {
    leftWrist: { x: 345, y: 500 },
    rightWrist: { x: 420, y: 500 },
  }),
  parry_left: from(guard, {
    leftWrist: { x: 465, y: 545 },
    leftElbow: { x: 390, y: 585 },
  }),
  parry_right: from(guard, {
    rightWrist: { x: 470, y: 550 },
    rightElbow: { x: 415, y: 585 },
  }),
  parry_down: from(guard, { rightWrist: { x: 450, y: 670 } }),
  parry_up: from(guard, { rightWrist: { x: 450, y: 480 } }),
  deflect_inside: from(guard, { leftWrist: { x: 415, y: 550 } }),
  deflect_outside: from(guard, { leftWrist: { x: 300, y: 550 } }),
  dodge_back: from(guard, {
    torso: { x: 305, y: 625 },
    neck: { x: 280, y: 565 },
    head: { x: 260, y: 525 },
  }),
  dodge_left: from(guard, {}, -70),
  dodge_right: from(guard, {}, 70),
  dodge_down: crouch,
  lean_back: from(guard, {
    torso: { x: 300, y: 625 },
    neck: { x: 270, y: 565 },
    head: { x: 245, y: 525 },
  }),
  duck: crouch,
  sidestep_evade_left: from(guard, {}, -100),
  sidestep_evade_right: from(guard, {}, 100),
  slip_left: from(guard, {
    torso: { x: 330, y: 625 },
    head: { x: 315, y: 525 },
  }),
  slip_right: from(guard, {
    torso: { x: 400, y: 625 },
    head: { x: 420, y: 525 },
  }),
});
add("Reaction", {
  hit_head_left: reaction,
  hit_head_right: mirroredLocal(reaction),
  hit_body_front: from(reaction, {
    torso: { x: 320, y: 675 },
    head: { x: 300, y: 565 },
  }),
  hit_body_side: from(reaction, { torso: { x: 300, y: 650 } }),
  hit_leg: from(guard, {
    rightKnee: { x: 450, y: 800 },
    rightAnkle: { x: 400, y: 880 },
    torso: { x: 330, y: 640 },
  }),
  recoil_small: from(reaction, { head: { x: 285, y: 535 } }),
  recoil_medium: reaction,
  recoil_heavy: from(reaction, {
    torso: { x: 270, y: 660 },
    head: { x: 220, y: 560 },
  }),
  stagger_back: from(reaction, {}, -80),
  stagger_left: from(reaction, {}, -60),
  stagger_right: from(reaction, {}, 60),
  fold_body_hit: from(crouch, {
    torso: { x: 395, y: 710 },
    head: { x: 430, y: 650 },
  }),
  knockback_start: reaction,
  knockback_airborne: from(
    reaction,
    {
      leftKnee: { x: 300, y: 745 },
      rightKnee: { x: 420, y: 750 },
      leftAnkle: { x: 250, y: 780 },
      rightAnkle: { x: 465, y: 790 },
    },
    -40,
    -150,
  ),
});
add("Ground", {
  knockback_land: crouch,
  fall_forward_start: from(guard, {
    torso: { x: 450, y: 690 },
    head: { x: 500, y: 650 },
  }),
  fall_forward_ground: make({
    root: { x: 0, y: 0 },
    torso: { x: 480, y: 850 },
    neck: { x: 535, y: 865 },
    head: { x: 580, y: 870 },
    leftShoulder: { x: 500, y: 840 },
    rightShoulder: { x: 500, y: 880 },
    leftElbow: { x: 550, y: 820 },
    rightElbow: { x: 550, y: 900 },
    leftWrist: { x: 610, y: 815 },
    rightWrist: { x: 610, y: 900 },
    leftHip: { x: 390, y: 850 },
    rightHip: { x: 395, y: 885 },
    leftKnee: { x: 300, y: 850 },
    rightKnee: { x: 310, y: 900 },
    leftAnkle: { x: 220, y: 850 },
    rightAnkle: { x: 230, y: 900 },
  }),
  fall_backward_start: from(reaction, {
    torso: { x: 270, y: 700 },
    head: { x: 220, y: 650 },
  }),
  fall_backward_ground: make({
    torso: { x: 430, y: 850 },
    neck: { x: 500, y: 840 },
    head: { x: 550, y: 830 },
    leftShoulder: { x: 455, y: 825 },
    rightShoulder: { x: 450, y: 875 },
    leftElbow: { x: 500, y: 780 },
    rightElbow: { x: 500, y: 910 },
    leftWrist: { x: 560, y: 770 },
    rightWrist: { x: 560, y: 910 },
    leftHip: { x: 350, y: 845 },
    rightHip: { x: 355, y: 885 },
    leftKnee: { x: 280, y: 810 },
    rightKnee: { x: 275, y: 900 },
    leftAnkle: { x: 210, y: 800 },
    rightAnkle: { x: 205, y: 900 },
  }),
  fall_side_start: reaction,
  fall_side_ground: from(crouch, {
    torso: { x: 450, y: 850 },
    head: { x: 550, y: 850 },
  }),
  ground_down_back: from(crouch, {
    torso: { x: 440, y: 850 },
    head: { x: 535, y: 840 },
  }),
  ground_down_front: from(crouch, {
    torso: { x: 450, y: 870 },
    head: { x: 550, y: 880 },
  }),
  ground_down_side: from(crouch, {
    torso: { x: 450, y: 850 },
    head: { x: 535, y: 850 },
  }),
  ground_recovery_start: crouch,
  ground_recovery_mid: from(crouch, { torso: { x: 370, y: 675 } }),
  ground_recovery_end: guard,
  stand_recovery: guard,
  combat_recovery: guard,
});
add("Acrobatic", {
  cartwheel_start: from(guard, {
    torso: { x: 440, y: 700 },
    head: { x: 500, y: 690 },
    rightWrist: { x: 550, y: 820 },
  }),
  cartwheel_inverted: make({
    torso: { x: 430, y: 650 },
    neck: { x: 430, y: 710 },
    head: { x: 430, y: 755 },
    leftShoulder: { x: 400, y: 700 },
    rightShoulder: { x: 460, y: 700 },
    leftElbow: { x: 370, y: 770 },
    rightElbow: { x: 490, y: 770 },
    leftWrist: { x: 350, y: 900 },
    rightWrist: { x: 510, y: 900 },
    leftHip: { x: 400, y: 600 },
    rightHip: { x: 460, y: 600 },
    leftKnee: { x: 340, y: 510 },
    rightKnee: { x: 520, y: 510 },
    leftAnkle: { x: 300, y: 420 },
    rightAnkle: { x: 560, y: 420 },
  }),
  cartwheel_land: guard,
  frontflip_start: crouch,
  frontflip_inverted: from(
    crouch,
    {
      head: { x: 430, y: 760 },
      leftAnkle: { x: 300, y: 500 },
      rightAnkle: { x: 450, y: 500 },
    },
    0,
    -130,
  ),
  frontflip_land: crouch,
  backflip_start: crouch,
  backflip_inverted: from(
    crouch,
    {
      head: { x: 300, y: 760 },
      leftAnkle: { x: 280, y: 500 },
      rightAnkle: { x: 440, y: 500 },
    },
    0,
    -130,
  ),
  backflip_land: crouch,
  aerial_spin: from(kick("side"), {}, 0, -180),
  wall_jump_contact: from(
    crouch,
    { rightAnkle: { x: 560, y: 760 }, rightKnee: { x: 470, y: 720 } },
    0,
    -80,
  ),
  wall_jump_push: from(guard, { rightAnkle: { x: 560, y: 730 } }, 0, -140),
  superhero_land: from(crouch, {
    leftWrist: { x: 500, y: 885 },
    leftElbow: { x: 440, y: 820 },
    rightWrist: { x: 320, y: 560 },
  }),
});

function mirroredLocal(pose: Pose) {
  const p = clonePose(pose),
    x = p.root.x;
  for (const j in p) p[j as JointName].x = x - (p[j as JointName].x - x);
  return p;
}
// Melee V1 uses authored whole-body silhouettes.  The hand path drives the
// attached blade, while hips, feet and torso provide readable weight transfer.
const sword = (id:string,name:string, edit:Edit, tags:string[]=["sword","melee"]) =>
  ({ id, name, category:"Sword" as const, pose:from(guard,edit), tags });
entries.push(
  sword("sword_neutral","Sword Neutral",{rightElbow:{x:410,y:620},rightWrist:{x:438,y:665},leftWrist:{x:360,y:610}}),
  sword("sword_guard_high","Sword High Guard",{torso:{x:365,y:620},rightElbow:{x:405,y:535},rightWrist:{x:370,y:485},leftElbow:{x:345,y:545},leftWrist:{x:370,y:500},leftKnee:{x:300,y:805},rightKnee:{x:430,y:805}}),
  sword("sword_guard_mid","Sword Mid Guard",{rightElbow:{x:420,y:585},rightWrist:{x:475,y:610},leftElbow:{x:360,y:590},leftWrist:{x:405,y:610}}),
  sword("sword_guard_low","Sword Low Guard",{torso:{x:360,y:650},rightElbow:{x:405,y:650},rightWrist:{x:455,y:710},leftWrist:{x:390,y:665},leftKnee:{x:290,y:820},rightKnee:{x:440,y:815}}),
  sword("sword_ready_overhead","Overhead Ready",{torso:{x:350,y:615},neck:{x:360,y:560},head:{x:365,y:520},rightElbow:{x:410,y:510},rightWrist:{x:350,y:455},leftElbow:{x:330,y:520},leftWrist:{x:365,y:470},leftHip:{x:325,y:715},rightHip:{x:375,y:715}}),
  sword("sword_ready_side","Side Ready",{torso:{x:350,y:625},rightShoulder:{x:390,y:565},rightElbow:{x:330,y:590},rightWrist:{x:285,y:640},leftWrist:{x:350,y:600},leftKnee:{x:295,y:810},rightKnee:{x:430,y:800}}),
  sword("sword_recovery","Sword Recovery",{torso:{x:385,y:635},rightElbow:{x:445,y:625},rightWrist:{x:475,y:690},leftWrist:{x:390,y:630},leftKnee:{x:315,y:805},rightKnee:{x:455,y:805}}),
  sword("sword_defensive_guard","Defensive Sword Guard",{rightElbow:{x:410,y:560},rightWrist:{x:385,y:520},leftElbow:{x:350,y:580},leftWrist:{x:390,y:545},torso:{x:355,y:630}}),
  sword("sword_slash_horizontal_contact","Horizontal Slash Contact",{torso:{x:410,y:630},neck:{x:405,y:565},head:{x:400,y:525},rightShoulder:{x:430,y:570},rightElbow:{x:485,y:585},rightWrist:{x:545,y:600},leftElbow:{x:385,y:600},leftWrist:{x:425,y:615},leftHip:{x:350,y:715},rightHip:{x:405,y:715},leftKnee:{x:305,y:810},rightKnee:{x:465,y:790}}),
  sword("sword_slash_horizontal_follow","Horizontal Slash Follow",{torso:{x:420,y:640},rightElbow:{x:445,y:655},rightWrist:{x:385,y:690},leftWrist:{x:410,y:645},leftHip:{x:355,y:715},rightHip:{x:415,y:715},leftKnee:{x:315,y:815},rightKnee:{x:475,y:790}}),
  sword("sword_slash_diagonal_contact","Diagonal Slash Contact",{torso:{x:400,y:625},rightElbow:{x:465,y:570},rightWrist:{x:515,y:625},leftElbow:{x:390,y:590},leftWrist:{x:430,y:610},leftHip:{x:345,y:715},rightHip:{x:400,y:715},rightKnee:{x:460,y:795}}),
  sword("sword_slash_low_contact","Low Slash Contact",{torso:{x:395,y:670},neck:{x:390,y:610},head:{x:390,y:570},rightElbow:{x:450,y:665},rightWrist:{x:520,y:720},leftWrist:{x:410,y:670},leftHip:{x:345,y:750},rightHip:{x:405,y:750},leftKnee:{x:285,y:825},rightKnee:{x:465,y:825}}),
  sword("sword_thrust_anticipation","Thrust Anticipation",{torso:{x:335,y:625},rightElbow:{x:385,y:600},rightWrist:{x:350,y:625},leftWrist:{x:375,y:610},leftHip:{x:320,y:715},rightHip:{x:370,y:715},leftKnee:{x:285,y:805},rightKnee:{x:420,y:805}}),
  sword("sword_thrust_contact","Thrust Contact",{torso:{x:420,y:625},neck:{x:415,y:565},head:{x:410,y:525},rightShoulder:{x:445,y:570},rightElbow:{x:505,y:580},rightWrist:{x:575,y:585},leftElbow:{x:405,y:590},leftWrist:{x:455,y:590},leftHip:{x:365,y:715},rightHip:{x:420,y:715},leftKnee:{x:315,y:810},rightKnee:{x:500,y:790},rightAnkle:{x:540,y:890}}),
  sword("sword_parry_left","Sword Parry Left",{torso:{x:350,y:625},rightElbow:{x:350,y:555},rightWrist:{x:315,y:525},leftWrist:{x:350,y:555},leftKnee:{x:290,y:810}}),
  sword("sword_parry_right","Sword Parry Right",{torso:{x:390,y:625},rightElbow:{x:430,y:550},rightWrist:{x:470,y:520},leftWrist:{x:410,y:555},rightKnee:{x:450,y:805}}),
  sword("sword_spin_contact","Spinning Slash Contact",{torso:{x:405,y:625},rightShoulder:{x:380,y:570},rightElbow:{x:320,y:580},rightWrist:{x:265,y:600},leftElbow:{x:425,y:590},leftWrist:{x:470,y:610},leftHip:{x:350,y:715},rightHip:{x:410,y:715},leftKnee:{x:310,y:800},rightKnee:{x:460,y:810}}),
  sword("sword_lunge_contact","Lunge Slash Contact",{torso:{x:450,y:650},neck:{x:440,y:585},head:{x:435,y:545},rightElbow:{x:500,y:590},rightWrist:{x:560,y:620},leftWrist:{x:450,y:625},leftHip:{x:390,y:730},rightHip:{x:445,y:730},leftKnee:{x:315,y:800},leftAnkle:{x:250,y:895},rightKnee:{x:525,y:800},rightAnkle:{x:580,y:895}}),
  sword("sword_clash","Sword Clash",{torso:{x:390,y:625},rightElbow:{x:435,y:550},rightWrist:{x:470,y:515},leftElbow:{x:370,y:575},leftWrist:{x:415,y:535},leftKnee:{x:305,y:810},rightKnee:{x:450,y:800}}),
  sword("sword_hit_reaction","Sword Body Hit Reaction",{torso:{x:315,y:655},neck:{x:320,y:590},head:{x:305,y:545},rightElbow:{x:350,y:635},rightWrist:{x:390,y:690},leftElbow:{x:285,y:615},leftWrist:{x:260,y:665},leftHip:{x:310,y:730},rightHip:{x:365,y:730},leftKnee:{x:285,y:815},rightKnee:{x:420,y:825}})
);
entries.push(...dancePoseEntries);
export const poseCatalog = entries;
export const poses: Record<string, Pose> = Object.fromEntries(
  entries.map((e) => [e.id, e.pose]),
);
Object.assign(poses, {
  idle: poses.idle_relaxed,
  "Fight Stance": poses.fight_guard,
  Crouch: poses.crouch,
  "Jump Anticipation": poses.jump_anticipation,
  "Punch Anticipation": poses.straight_punch_anticipation,
  "Punch Extension": poses.straight_punch_extension,
  "Kick Anticipation": poses.kick_chamber_front,
  "Kick Extension": poses.front_kick_extension,
  Block: poses.block_high,
  Dodge: poses.dodge_back,
});
export const mirrored = mirroredLocal;
