import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_STORAGE_KEY = '@SmokeGuardAI:coachHistory';
const COACH_THREADS_KEY = '@SmokeGuardAI:coachThreads';
const COACH_MESSAGES_PREFIX = '@SmokeGuardAI:coachMessages:';

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

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Migrate old single-chat data to multi-chat data
const migrateIfNeeded = async (): Promise<ChatThread[]> => {
  try {
    const legacyHistoryStr = await AsyncStorage.getItem(COACH_STORAGE_KEY);
    if (!legacyHistoryStr) return [];

    const legacyHistory: ChatMessage[] = JSON.parse(legacyHistoryStr);
    if (legacyHistory.length === 0) return [];

    // Create a legacy thread
    const legacyThreadId = 'legacy_default';
    const firstMsg = legacyHistory[0];
    const lastMsg = legacyHistory[legacyHistory.length - 1];
    
    let title = 'coach.oldChat';
    if (firstMsg && firstMsg.text) {
      title = firstMsg.text.substring(0, 30) + (firstMsg.text.length > 30 ? '...' : '');
    }

    const legacyThread: ChatThread = {
      id: legacyThreadId,
      title,
      createdAt: firstMsg ? firstMsg.timestamp : new Date().toISOString(),
      updatedAt: lastMsg ? lastMsg.timestamp : new Date().toISOString(),
    };

    // Save legacy thread and its messages
    await AsyncStorage.setItem(COACH_THREADS_KEY, JSON.stringify([legacyThread]));
    await AsyncStorage.setItem(`${COACH_MESSAGES_PREFIX}${legacyThreadId}`, legacyHistoryStr);
    
    // Clear legacy single key to prevent migrating again
    await AsyncStorage.removeItem(COACH_STORAGE_KEY);

    return [legacyThread];
  } catch (error) {
    console.error('Migration error:', error);
    return [];
  }
};

export const getThreads = async (): Promise<ChatThread[]> => {
  try {
    const threadsStr = await AsyncStorage.getItem(COACH_THREADS_KEY);
    if (!threadsStr) {
      // Check legacy migration
      return await migrateIfNeeded();
    }
    return JSON.parse(threadsStr);
  } catch (error) {
    console.error('Error getting threads:', error);
    return [];
  }
};

export const createThread = async (title?: string): Promise<ChatThread> => {
  try {
    const threads = await getThreads();
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: title || 'coach.newChat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedThreads = [newThread, ...threads];
    await AsyncStorage.setItem(COACH_THREADS_KEY, JSON.stringify(updatedThreads));
    return newThread;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
};

export const deleteThread = async (threadId: string): Promise<void> => {
  try {
    const threads = await getThreads();
    const updatedThreads = threads.filter(t => t.id !== threadId);
    await AsyncStorage.setItem(COACH_THREADS_KEY, JSON.stringify(updatedThreads));
    await AsyncStorage.removeItem(`${COACH_MESSAGES_PREFIX}${threadId}`);
  } catch (error) {
    console.error('Error deleting thread:', error);
  }
};

export const getChatHistory = async (threadId?: string): Promise<ChatMessage[]> => {
  try {
    let activeId = threadId;
    if (!activeId) {
      const threads = await getThreads();
      if (threads.length === 0) {
        return [];
      }
      activeId = threads[0].id;
    }

    const data = await AsyncStorage.getItem(`${COACH_MESSAGES_PREFIX}${activeId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
};

export const saveMessage = async (message: ChatMessage, threadId?: string) => {
  try {
    let targetThreadId = threadId;
    
    // Fallback if no threadId provided
    if (!targetThreadId) {
      const threads = await getThreads();
      if (threads.length === 0) {
        const newT = await createThread();
        targetThreadId = newT.id;
      } else {
        targetThreadId = threads[0].id;
      }
    }

    // 1. Save message to thread-specific store
    const history = await getChatHistory(targetThreadId);
    history.push(message);
    await AsyncStorage.setItem(`${COACH_MESSAGES_PREFIX}${targetThreadId}`, JSON.stringify(history));

    // 2. Update thread's metadata
    const threads = await getThreads();
    const threadIndex = threads.findIndex(t => t.id === targetThreadId);
    if (threadIndex > -1) {
      threads[threadIndex].updatedAt = new Date().toISOString();
      
      // If the title is 'coach.newChat' and user sent the message, let's update the title
      if (
        (threads[threadIndex].title === 'coach.newChat' || threads[threadIndex].title === '') &&
        message.role === 'user'
      ) {
        threads[threadIndex].title = message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '');
      }

      // Reorder threads to bring updated thread to top
      const updatedThread = threads[threadIndex];
      const reorderedThreads = [
        updatedThread,
        ...threads.filter(t => t.id !== targetThreadId)
      ];
      
      await AsyncStorage.setItem(COACH_THREADS_KEY, JSON.stringify(reorderedThreads));
    }
  } catch (error) {
    console.error('Error saving message:', error);
  }
};

export const sendMessageToCoach = async (userMessage: string, context: string): Promise<string> => {
  // Debug log
  console.log('DEBUG: GROQ_API_KEY is', GROQ_API_KEY ? 'defined' : 'undefined');
  console.log('DEBUG: GROQ_API_KEY prefix:', GROQ_API_KEY?.substring(0, 4));

  if (!GROQ_API_KEY) {
    console.error('AI Coach Error: GROQ_API_KEY is missing!');
    return "Lỗi cấu hình: Không tìm thấy khóa API.";
  }

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

    // Get the response text regardless of status to debug 401
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`AI Coach API Error: ${response.status} - ${responseText}`);
      return `Lỗi kết nối API: ${response.status}. Chi tiết: ${responseText.substring(0, 50)}`;
    }

    const data = JSON.parse(responseText);
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      console.error('AI Coach Response Format Error:', responseText);
      return "Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn có thể nói rõ hơn không?";
    }
  } catch (error) {
    console.error('AI Coach Network Error:', error);
    return "Xin lỗi, tôi đang gặp chút khó khăn kỹ thuật. Bạn vẫn đang làm rất tốt, hãy hít thở sâu nhé!";
  }
};
