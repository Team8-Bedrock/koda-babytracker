import { AngryRig } from "../panda/AngryPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function AngryKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.angry} mood="angry" Rig={AngryRig} />;
}
