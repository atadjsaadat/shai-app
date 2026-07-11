export interface OnboardingData {
  childName?: string;
  birthMonthYear?: string;
  sex?: 'male' | 'female' | 'not_specified';
  allergies?: string[];
  isSelectiveEater?: boolean;
  selectiveEaterDetails?: string;
  birthWeight?: string;
  relationshipToChild?: string;
  dietaryPreference?: string;
  parentName?: string;
}

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export interface ChatApiRequest {
  messages: { role: 'assistant' | 'user'; content: string }[];
  collected: OnboardingData;
}

export interface ChatApiResponse {
  message: string;
  collected: Partial<OnboardingData>;
  complete: boolean;
}
