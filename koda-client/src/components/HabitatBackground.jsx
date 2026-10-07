// Renders the correct per-avatar 3D habitat scene behind every page
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useGLTF } from "@react-three/drei";
import { getSelectedChildForUser } from "../utils/authStorage";
import { getAvatarById, DEFAULT_MODEL } from "../constants/avatars";
import { API_URL } from "../config";
import FoxHabitat3D from "./habitats/FoxHabitat3D";
import FrogHabitat3D from "./habitats/FrogHabitat3D";
import BunnyHabitat3D from "./habitats/BunnyHabitat3D";
import PandaHabitat3D from "./habitats/PandaHabitat3D";
import BearHabitat3D from "./habitats/BearHabitat3D";
import KoalaHabitat3D from "./habitats/KoalaHabitat3D";
import "../styling/components/habitatBackground.css";
import "../styling/pages/setUp.css";

useGLTF.preload(DEFAULT_MODEL);
useGLTF.preload("/models/feeding.glb");
useGLTF.preload("/models/sleep.glb");

const FROG_HABITAT_PATHS = ["/parentdashboard", "/add-activity"];

const HabitatBackground = () => {
  const location = useLocation();
  const selectedChild = getSelectedChildForUser();
  const character = getAvatarById(selectedChild?.avatar);
  const characterModel = character?.model || DEFAULT_MODEL;
  const [isUnlinkedCaregiver, setIsUnlinkedCaregiver] = useState(false);

  const allowFrogHabitat = FROG_HABITAT_PATHS.includes(location.pathname.toLowerCase());

  useEffect(() => {
    useGLTF.preload(characterModel);
  }, [characterModel]);

  useEffect(() => {
    if (character) {
      setIsUnlinkedCaregiver(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/auth/me`, { headers: { "x-auth-token": token } })
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => setIsUnlinkedCaregiver(user?.role === "caregiver"))
      .catch(() => setIsUnlinkedCaregiver(false));
  }, [character]);

  if (!character && isUnlinkedCaregiver) {
    return (
      <div className="habitat-background-container">
        <div className="setup-container habitat-caregiver-unlinked-bg">
          <div className="firefly-layer">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="firefly" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="habitat-background-container">
      {character?.customHabitat === "fox" ? (
        <FoxHabitat3D characterModel={characterModel} />
      ) : character?.customHabitat === "frog" && allowFrogHabitat ? (
        <FrogHabitat3D characterModel={characterModel} />
      ) : character?.customHabitat === "bunny" ? (
        <BunnyHabitat3D characterModel={characterModel} />
      ) : character?.customHabitat === "panda" ? (
        <PandaHabitat3D characterModel={characterModel} />
      ) : character?.customHabitat === "bear" ? (
        <BearHabitat3D characterModel={characterModel} />
      ) : character?.customHabitat === "koala" ? (
        <KoalaHabitat3D characterModel={characterModel} />
      ) : (
        <div className="habitat-plain-bg">
          <div
            className="habitat-plain-bg-image"
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL + "/lightmode.jpg"})` }}
          />
        </div>
      )}
    </div>
  );
};

export default HabitatBackground;