import { sendMessageToCoach, getChatHistory, saveMessage } from '../utils/ai-coach-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mocking AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mocking global fetch
global.fetch = jest.fn();

describe('AI Coach Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send message to Groq API and return response', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Hello! I am here to help.' } }],
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse),
    });

    const result = await sendMessageToCoach('Hello', 'Quit smoking');
    expect(result).toBe('Hello! I am here to help.');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should return error message when API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API error'));

    const result = await sendMessageToCoach('Hello', 'Quit smoking');
    expect(result).toContain('Xin lỗi, tôi đang gặp chút khó khăn kỹ thuật');
  });

  it('should save and retrieve chat history', async () => {
    const mockHistory = [{ id: '1', role: 'user', text: 'Hi', timestamp: '2026-06-22' }];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockHistory));

    const history = await getChatHistory();
    expect(history).toEqual(mockHistory);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@SmokeGuardAI:coachHistory');
  });
});
