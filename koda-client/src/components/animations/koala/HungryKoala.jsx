import { HungryRig } from "../panda/HungryPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function HungryKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.hungry} mood="hungry" Rig={HungryRig} />;
}
