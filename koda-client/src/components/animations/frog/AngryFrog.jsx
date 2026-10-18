import { AngryRig } from "../panda/AngryPanda";
import { FrogMood, FROG_MODELS } from "./frogRig";

export default function AngryFrog(props) {
  return <FrogMood {...props} modelUrl={FROG_MODELS.angry} leaf="angry" Rig={AngryRig} />;
}
