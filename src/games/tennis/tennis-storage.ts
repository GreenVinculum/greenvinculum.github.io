const STORAGE_KEY = "pocketUniverseProfile";

export type UniverseProfile = {
  displayName: string;
  tennis: {
    wins: number;
    losses: number;
    bestPlayerScore: number;
    highestAiLevel: number;
    currentCpuLevel: number;
  };
};

const DEFAULT_PROFILE: UniverseProfile = {
  displayName: "Player",
  tennis: {
    wins: 0,
    losses: 0,
    bestPlayerScore: 0,
    highestAiLevel: 1,
    currentCpuLevel: 1,
  },
};

export function loadProfile(): UniverseProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<UniverseProfile>;
    return {
      displayName: parsed.displayName?.trim() || DEFAULT_PROFILE.displayName,
      tennis: {
        wins: parsed.tennis?.wins ?? 0,
        losses: parsed.tennis?.losses ?? 0,
        bestPlayerScore: parsed.tennis?.bestPlayerScore ?? 0,
        highestAiLevel: parsed.tennis?.highestAiLevel ?? 1,
        currentCpuLevel: parsed.tennis?.currentCpuLevel ?? 1,
      },
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UniverseProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function saveDisplayName(name: string) {
  const profile = loadProfile();
  profile.displayName = name.trim() || DEFAULT_PROFILE.displayName;
  saveProfile(profile);
}

export function recordMatchResult(
  playerScore: number,
  aiScore: number,
  aiLevel: number,
  playerWon: boolean
) {
  const profile = loadProfile();
  if (playerWon) profile.tennis.wins += 1;
  else profile.tennis.losses += 1;
  profile.tennis.bestPlayerScore = Math.max(profile.tennis.bestPlayerScore, playerScore);
  if (playerWon) {
    profile.tennis.currentCpuLevel = aiLevel + 1;
    profile.tennis.highestAiLevel = Math.max(profile.tennis.highestAiLevel, aiLevel + 1);
  } else {
    profile.tennis.currentCpuLevel = Math.max(1, aiLevel - 1);
  }
  saveProfile(profile);
  return profile;
}
