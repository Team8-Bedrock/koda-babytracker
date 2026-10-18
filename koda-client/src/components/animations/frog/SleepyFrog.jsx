import { SleepyRig } from "../panda/SleepyPanda";
import { FrogMood, FROG_MODELS } from "./frogRig";

export default function SleepyFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_MODELS.sleepy} leaf="sleepy" Rig={SleepyRig} />;
}
