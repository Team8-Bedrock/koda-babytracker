import { HungryRig } from "../panda/HungryPanda";
import { FrogMood, FROG_MODELS } from "./frogRig";

export default function HungryFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_MODELS.hungry} leaf="hungry" Rig={HungryRig} />;
}
