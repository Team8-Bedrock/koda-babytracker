import { SleepyRig } from "../panda/SleepyPanda";
import { KoalaMood, KOALA_MODELS } from "./koalaRig";

export default function SleepyKoala(props) {
  return <KoalaMood {...props} modelUrl={KOALA_MODELS.sleepy} mood="sleepy" Rig={SleepyRig} />;
}
