import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface Channel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

export interface Skill {
  name: string;
  description: string;
  enabled: boolean;
  installed: boolean;
}

export interface Settings {
  language: string;
  theme: string;
  autoStart: boolean;
  proxy?: {
    server?: string;
    bypass?: string;
  };
}

interface AppState {
  messages: Message[];
  currentChannelId: string;
  channels: Channel[];
  skills: Skill[];
  settings: Settings;
  gatewayRunning: boolean;
  isLoading: boolean;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setCurrentChannelId: (id: string) => void;
  setChannels: (channels: Channel[]) => void;
  setSkills: (skills: Skill[]) => void;
  setSettings: (settings: Settings) => void;
  setGatewayRunning: (running: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  currentChannelId: "default",
  channels: [],
  skills: [],
  settings: {
    language: "en",
    theme: "system",
    autoStart: false,
  },
  gatewayRunning: false,
  isLoading: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setCurrentChannelId: (id) => set({ currentChannelId: id }),
  setChannels: (channels) => set({ channels }),
  setSkills: (skills) => set({ skills }),
  setSettings: (settings) => set({ settings }),
  setGatewayRunning: (running) => set({ gatewayRunning: running }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
