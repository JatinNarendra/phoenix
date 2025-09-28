enum AvatarLevelImage {
  Level1 = "Level 1",
  Level2 = "Level 2",
  Level3 = "Level 3",
  Level4 = "Level 4",
  Level5 = "Level 5",
  Level6 = "Level 6",
  Level7 = "Level 7",
  Level8 = "Level 8",
  Level9 = "Level 9",
  Level10 = "Level 10",
}

enum LevelBadge {
  Level1 = "Level 1",
  Level2 = "Level 2",
  Level3 = "Level 3",
  Level4 = "Level 4",
  Level5 = "Level 5",
  Level6 = "Level 6",
  Level7 = "Level 7",
  Level8 = "Level 8",
  Level9 = "Level 9",
  Level10 = "Level 10",
}

enum LevelDetailsLearnMoreBg {
  Level1 = "Level 1",
  Level2 = "Level 2",
  Level3 = "Level 3",
  Level4 = "Level 4",
  Level5 = "Level 5",
  Level6 = "Level 6",
  Level7 = "Level 7",
  Level8 = "Level 8",
  Level9 = "Level 9",
  Level10 = "Level 10",
}

interface LevelConfig {
  sparkRequired: number;
  title: string;
  phoenixAvatar: AvatarLevelImage;
  levelBadge: LevelBadge;
  level: number;
  levelCompletionReward: number;
  levelDescription: string;
  leveldetailslearnmorebg: LevelDetailsLearnMoreBg;
}

export const levelConfig: Record<number, LevelConfig> = {
  1: {
    sparkRequired: 10000000, // Production value: 10000000
    level: 1,
    title: "Sparky Egg",
    phoenixAvatar: AvatarLevelImage.Level1,
    levelBadge: LevelBadge.Level1,
    levelCompletionReward: 500000, // Production value: 500000
    levelDescription:
      "The Sparky Egg is the mysterious beginning of every Phoenix journey. Encased in a glowing shell of cosmic energy, this egg pulses with untapped power and potential. It holds within the soul of Sparky, awaiting the energy of your taps to hatch. Though fragile, it radiates warmth and promise, symbolizing rebirth and destiny. Every player starts here, nurturing their egg through interaction, engagement, and effort. As the first stage, it represents the calm before the blaze - a dormant spark waiting to ignite. Protect it, energize it, and witness the birth of your legendary Phoenix companion.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level1,
  },
  2: {
    sparkRequired: 160000000, // Production value: 160000000
    level: 2,
    title: "Flame Hatchling",
    phoenixAvatar: AvatarLevelImage.Level2,
    levelBadge: LevelBadge.Level2,
    levelCompletionReward: 4000000, // Production value: 4000000
    levelDescription:
      "The Flame Hatchling emerges from the Sparky Egg in a burst of light and fire. Small yet lively, this newborn Phoenix flickers with fiery innocence. Its feathers glow like embers, and it responds eagerly to your taps and commands. This stage introduces players to Sparky's evolution, where every interaction fuels growth. Though not yet strong, the hatchling shows signs of strength and resilience. Each flap of its tiny wings signals its readiness for the journey ahead. With care, dedication, and gameplay, the Flame Hatchling will soon grow stronger and hotter, evolving into a fiercer form of Sparky.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level2,
  },
  3: {
    sparkRequired: 490000000, // Production value: 490000000
    level: 3,
    title: "Blazing Ember Sparky",
    phoenixAvatar: AvatarLevelImage.Level3,
    levelBadge: LevelBadge.Level3,
    levelCompletionReward: 12500000, // Production value: 12500000
    levelDescription:
      "The Blazing Ember Sparky is where the heat turns real. No longer a hatchling, Sparky now burns with purpose and energy. Its body radiates glowing embers, and it leaves trails of sparks as it moves. This phase symbolizes determination and rising intensity. As a Blazing Ember, Sparky unlocks new abilities and earns greater rewards. It begins to test its strength and independence, preparing for battles and challenges. Every spin, tap, and mission accelerates its fiery evolution. This is the spark before the flame, a stage where your Phoenix starts showing true potential and begins standing out among other players' companions.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level3,
  },
  4: {
    sparkRequired: 1400000000, // Production value: 1400000000
    level: 4,
    title: "Warrior Phoenix",
    phoenixAvatar: AvatarLevelImage.Level4,
    levelBadge: LevelBadge.Level4,
    levelCompletionReward: 21000000, // Production value: 21000000
    levelDescription:
      "Now fully awakened, Sparky becomes the Warrior Phoenix - a formidable force of flame and courage. It dons fiery armor, and its wings blaze with explosive power. This stage is all about strength, resilience, and the first taste of real combat potential. The Warrior Phoenix is more than a pet - it's your battle partner. With powerful moves and higher energy capacity, it earns more SPARK Coins and levels up faster. This is a crucial stage where your gameplay choices directly impact Sparky’s growth. Brave, bold, and bursting with heat, the Warrior Phoenix is built for glory and rising through the GameFi ranks.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level4,
  },
  5: {
    sparkRequired: 3400000000, // Production value: 3400000000
    level: 5,
    title: "Inferno Spirit",
    phoenixAvatar: AvatarLevelImage.Level5,
    levelBadge: LevelBadge.Level5,
    levelCompletionReward: 27000000, // Production value: 27000000
    levelDescription:
      "The Inferno Spirit is a blazing embodiment of elemental rage. At this stage, Sparky transcends its physical form to channel fire in its purest essence. Glowing veins of magma run through its wings and body, and its eyes spark with intense flame wisdom. This level unlocks elemental powers, passive rewards, and fiery customizations. The Inferno Spirit is revered by allies and feared by enemies - a sign that your Phoenix has begun mastering its cosmic powers. More than a creature, it becomes a spiritual force of destruction and rebirth, burning everything in its path with purpose and precision.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level5,
  },
  6: {
    sparkRequired: 8400000000, // Production value: 8400000000
    level: 6,
    title: "Celestial Flarebird",
    phoenixAvatar: AvatarLevelImage.Level6,
    levelBadge: LevelBadge.Level6,
    levelCompletionReward: 36000000, // Production value: 36000000
    levelDescription:
      "As the Celestial Flarebird, Sparky soars through cosmic flames and harnesses stellar energy. Its wings glisten with fragments of stars, and its flames shift in celestial colors. This stage is a magnificent fusion of elegance and strength. The Flarebird excels in long-term earning, combo-based boosts, and visual brilliance in the game. It’s not just strong- it’s radiant. Your gameplay reflects this elevated status, and every interaction with Sparky becomes more impactful. The Celestial Flarebird represents clarity, control, and cosmic beauty - a beacon guiding your journey toward even more legendary forms.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level6,
  },
  7: {
    sparkRequired: 12000000000, // Production value: 12000000000
    level: 7,
    title: "Solar Guardian",
    phoenixAvatar: AvatarLevelImage.Level7,
    levelBadge: LevelBadge.Level7,
    levelCompletionReward: 45000000, // Production value: 45000000
    levelDescription:
      "The Solar Guardian is a protector of realms, burning with the power of a sun. At this stage, Sparky gains defensive boosts and leadership abilities, capable of shielding allies and radiating empowerment. Its feathers shimmer with solar flares, and its presence boosts rewards and synergy in gameplay. This form marks Sparky's growth into a wise and radiant guardian. As you continue your evolution journey, the Solar Guardian reinforces your status as a core player in the ecosystem. It’s a role model in the sky - not just strong, but purposeful, offering light and strength to all around it.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level7,
  },
  8: {
    sparkRequired: 29000000000, // Production value: 29000000000
    level: 8,
    title: "Elder Sun Sparky",
    phoenixAvatar: AvatarLevelImage.Level8,
    levelBadge: LevelBadge.Level8,
    levelCompletionReward: 60000000, // Production value: 60000000
    levelDescription:
      "The Elder Sun Sparky embodies ancient wisdom and solar might. Its wings cast glowing solar arcs, and its roar echoes like the eruption of a star. This form marks a shift from fiery power to cosmic intellect. It unlocks advanced skills, bonus rewards, and strategic enhancements that influence gameplay at scale. The Elder Sun Sparky isn't just evolved — it's enlightened. It teaches players to balance fire and patience, speed and wisdom. By reaching this stage, you've proven your dedication to the game, unlocking access to elite challenges and showcasing Sparky as a true solar elder.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level8,
  },
  9: {
    sparkRequired: 79000000000, // Production value: 79000000000
    level: 9,
    title: "Galactic Firehawk",
    phoenixAvatar: AvatarLevelImage.Level9,
    levelBadge: LevelBadge.Level9,
    levelCompletionReward: 81000000, // Production value: 81000000
    levelDescription:
      "Soaring through galaxies, the Galactic Firehawk is a being of speed, flame, and fury. It commands the energy of stars and meteors, with wings that ripple through space and leave trails of fire. This is the fast lane of the evolution journey, where Sparky blazes across the leaderboard. With enhanced abilities, energy boosts, and multiplier effects, the Firehawk stage pushes gameplay into overdrive. It’s a phase of power, prestige, and interstellar recognition. In the Sparky universe, only the most dedicated players reach this level - a clear sign of a Phoenix destined for cosmic legend.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level9,
  },
  10: {
    sparkRequired: 110000000000, // Production value: 110000000000
    level: 10,
    title: "Legendary Cosmic Sparky",
    phoenixAvatar: AvatarLevelImage.Level10,
    levelBadge: LevelBadge.Level10,
    levelCompletionReward: 100000000, // Production value: 100000000
    levelDescription:
      "The final form. The myth. The flame is eternal. Legendary Cosmic Sparky transcends every limit, glowing with universal fire and radiating divine power. Its presence alters the battlefield, its power bends time, and its rewards are unmatched. Players who evolve to this tier unlock the game’s most exclusive benefits, elite visuals, and highest token earnings. With glowing cosmic rings and a phoenix cry that echoes through galaxies, this is Sparky’s full awakening. A true legend, earned through effort, gameplay, and belief in the flame. Only a few will reach it—but once you do, the SPARKY world will know your name.",
    leveldetailslearnmorebg: LevelDetailsLearnMoreBg.Level10,
  },
};
