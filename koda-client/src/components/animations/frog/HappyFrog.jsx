import { HappyRig } from "../panda/HappyPanda";
import { FrogMood, FROG_IDLE_MODEL } from "./frogRig";

export default function HappyFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="happy" Rig={HappyRig} />;
}
