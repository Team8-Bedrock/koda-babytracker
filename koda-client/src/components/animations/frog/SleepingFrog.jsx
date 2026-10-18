import { SleepingRig } from "../panda/SleepingPanda";
import { FrogMood, FROG_MODELS } from "./frogRig";

export default function SleepingFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_MODELS.sleeping} leaf="sleeping" Rig={SleepingRig} />;
}
