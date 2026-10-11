import { useEffect } from "react";
import { HappyRig } from "../panda/HappyPanda";
import { BearMood, BEAR_IDLE_MODEL } from "./bearRig";

function HappyBearRig({ rig }) {
  useEffect(() => {
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1.1, 0.35, 1)));
  }, [rig]);
  return <HappyRig rig={rig} />;
}

export default function HappyBear(props) {
  return <BearMood {...props} modelUrl={BEAR_IDLE_MODEL} Rig={HappyBearRig} />;
}
