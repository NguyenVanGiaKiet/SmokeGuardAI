import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_STORAGE_KEY = '@SmokeGuardAI:coachHistory';
// Note: In a production app, the API key should be managed securely (e.g., via environment variables or a secure backend proxy)
// For this prototype, we'll assume it's passed or available.
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY; 
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const getChatHistory = async (): Promise<ChatMessage[]> => {
  const data = await AsyncStorage.getItem(COACH_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveMessage = async (message: ChatMessage) => {
  const history = await getChatHistory();
  history.push(message);
  await AsyncStorage.setItem(COACH_STORAGE_KEY, JSON.stringify(history));
};

export const sendMessageToCoach = async (userMessage: string, context: string): Promise<string> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'system',
          content: `You are a supportive, empathetic AI coach helping the user quit smoking. Context: ${context}.`
        }, {
          role: 'user',
          content: userMessage
        }]
      })
    });

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      console.error('AI Coach Response Format Error:', JSON.stringify(data));
      return "Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn có thể nói rõ hơn không?";
    }
  } catch (error) {
    console.error('AI Coach Error:', error);
    return "Xin lỗi, tôi đang gặp chút khó khăn kỹ thuật. Bạn vẫn đang làm rất tốt, hãy hít thở sâu nhé!";
  }
};
