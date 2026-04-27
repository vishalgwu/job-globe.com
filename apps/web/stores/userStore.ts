"use client";

import { create } from "zustand";

import type {
  OnboardingAnswers,
  ProfileSummary,
  ProfileValidationError,
} from "@job-globe/shared-types";

export interface UserStore {
  userId: string | null;
  profile: ProfileSummary | null;
  onboardingAnswers: Partial<OnboardingAnswers>;
  isSavingProfile: boolean;
  profileErrors: ProfileValidationError[];
  setUserId: (userId: string | null) => void;
  setProfile: (profile: ProfileSummary | null) => void;
  setOnboardingAnswers: (answers: Partial<OnboardingAnswers>) => void;
  setSavingProfile: (isSavingProfile: boolean) => void;
  setProfileErrors: (profileErrors: ProfileValidationError[]) => void;
  resetUserState: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userId: null,
  profile: null,
  onboardingAnswers: {},
  isSavingProfile: false,
  profileErrors: [],
  setUserId: (userId) => set({ userId }),
  setProfile: (profile) => set({ profile }),
  setOnboardingAnswers: (answers) =>
    set((state) => ({
      onboardingAnswers: { ...state.onboardingAnswers, ...answers },
    })),
  setSavingProfile: (isSavingProfile) => set({ isSavingProfile }),
  setProfileErrors: (profileErrors) => set({ profileErrors }),
  resetUserState: () =>
    set({
      userId: null,
      profile: null,
      onboardingAnswers: {},
      isSavingProfile: false,
      profileErrors: [],
    }),
}));
