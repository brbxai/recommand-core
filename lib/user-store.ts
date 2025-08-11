import { create } from "zustand";
import { rc } from "@recommand/lib/client";
import type { Auth } from "@core/api/auth";
import { stringifyActionFailure } from "@recommand/lib/utils";
import type { UserWithoutPassword } from "@core/data/users";
import type { Team } from "@core/data/teams";
import type { CompletedOnboardingStep } from "@core/data/onboarding";

type MinimalCompletedOnboardingStep = Pick<
  CompletedOnboardingStep,
  "stepId" | "userId" | "teamId"
>;

interface UserState {
  user: UserWithoutPassword | null;
  completedOnboardingSteps: MinimalCompletedOnboardingStep[];
  addCompletedOnboardingStep: (step: MinimalCompletedOnboardingStep) => void;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  clearError: () => void;
  fetchUser: () => Promise<void>;

  teams: Team[];
  teamsAreLoaded: boolean;
  fetchTeams: () => Promise<void>;
  activeTeam: Team | null;
  setActiveTeam: (team: Team | string) => void;
}

const client = rc<Auth>("core");
function transformUserData(data: any): UserWithoutPassword & {
  teams?: Team[];
  completedOnboardingSteps: MinimalCompletedOnboardingStep[];
} {
  return {
    ...data,
    resetTokenExpires: data.resetTokenExpires
      ? new Date(data.resetTokenExpires)
      : null,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
    teams: data.teams?.map((team: any) => ({
      ...team,
      createdAt: new Date(team.createdAt),
    })),
    completedOnboardingSteps: data.completedOnboardingSteps,
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  completedOnboardingSteps: [],
  addCompletedOnboardingStep: (step: MinimalCompletedOnboardingStep) => {
    set((state) => ({
      completedOnboardingSteps: [...state.completedOnboardingSteps, step],
    }));
  },
  isLoading: true,
  error: null,
  teams: [],
  teamsAreLoaded: false,
  activeTeam: null,

  fetchUser: async () => {
    try {
      const userRes = await client.auth.me.$get();
      const userData = await userRes.json();
      if (userData.success && userData.data) {
        const transformedUser = transformUserData(userData.data);
        set({
          user: transformedUser,
          teams: transformedUser.teams,
          activeTeam: get().activeTeam || transformedUser.teams?.[0] || null,
          isLoading: false,
          completedOnboardingSteps: transformedUser.completedOnboardingSteps,
        });
      } else if (!userData.success) {
        set({
          error: stringifyActionFailure(userData.errors),
          isLoading: false,
        });
        throw new Error(stringifyActionFailure(userData.errors));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await client.auth.login.$post({
        json: { email, password },
      });
      const response = await res.json();

      if (response.success) {
        // Use fetchUser to get user data after successful login
        await get().fetchUser();
      } else {
        set({
          error: stringifyActionFailure(response.errors),
          isLoading: false,
        });
        throw new Error(stringifyActionFailure(response.errors));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  signup: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const res = await client.auth.signup.$post({
        json: { email, password },
      });
      const response = await res.json();

      if (response.success) {
        // Don't fetch user data - they need to confirm email first
        set({ isLoading: false });
        return response; // Return the response so the form can show the message
      } else {
        set({
          error: stringifyActionFailure(response.errors),
          isLoading: false,
        });
        throw new Error(stringifyActionFailure(response.errors));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await client.auth.logout.$post();
      const response = await res.json();

      if (response.success) {
        set({ user: null, isLoading: false });
      } else {
        set({
          error: stringifyActionFailure(response.errors),
          isLoading: false,
        });
        throw new Error(stringifyActionFailure(response.errors));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  fetchTeams: async () => {
    if (!get().user) {
      return;
    }
    const teamsRes = await client.auth.teams.$get();
    const teamsData = await teamsRes.json();
    if (teamsData.success) {
      const transformedTeams = teamsData.data.map((team) => ({
        ...team,
        createdAt: new Date(team.createdAt),
      }));
      set({
        teams: transformedTeams,
        teamsAreLoaded: true,
        activeTeam: get().activeTeam || transformedTeams[0] || null,
      });
    } else {
      set({
        error: stringifyActionFailure(teamsData.errors),
        isLoading: false,
      });
      throw new Error(stringifyActionFailure(teamsData.errors));
    }
  },

  setActiveTeam: (team: Team | string) => {
    if (typeof team === "string") {
      const foundTeam = get().teams.find((t) => t.id === team);
      set({ activeTeam: foundTeam || null });
    } else {
      set({ activeTeam: team });
    }
  },
}));
