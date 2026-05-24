import { useState, useRef, useEffect } from 'react';
import { exportService } from '../../services/export.service';
import type { UserContext as KaiContext } from '../../services/export.service';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Spacing, Radius } from '../../constants/theme';

type Role = 'user' | 'assistant';

interface Message {
  id:      string;
  role:    Role;
  content: string;
  time:    string;
}

// interface UserContext {
//   name:      string;
//   goal:      string;
//   level:     string;
//   weight:    string;
// }

const QUICK_PROMPTS: {
  id:    string;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'q1', label: 'Analyse my week',       icon: 'bar-chart-outline'    },
  { id: 'q2', label: 'Make me a meal plan',   icon: 'nutrition-outline'    },
  { id: 'q3', label: 'Why am I plateauing?',  icon: 'trending-up-outline'  },
  { id: 'q4', label: 'Today\'s workout',       icon: 'barbell-outline'      },
  { id: 'q5', label: 'Improve my sleep',       icon: 'moon-outline'         },
  { id: 'q6', label: 'Protein sources Nepal',  icon: 'leaf-outline'         },
];

const GOAL_LABELS: Record<string, string> = {
  lose_weight:    'Lose weight',
  build_muscle:   'Build muscle',
  run_faster:     'Run faster',
  flexibility:    'Flexibility',
  general_health: 'General health',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

function formatTime(): string {
  return new Date().toLocaleTimeString('en-NP', {
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function buildSystemPrompt(ctx: { name: string; goal: string; level: string; weight: string }): string {
    return `You are Kai, a professional fitness and nutrition coach inside FitNepal, a fitness app built for Nepal.

You are speaking with ${ctx.name}.
Goal: ${ctx.goal}
Fitness level: ${ctx.level}
Current weight: ${ctx.weight}

Last 7 days (approximate):
- Workouts completed: 4 of 5 planned
- Average daily calories: 1,847 (target: 2,400)
- Average protein: 112g (target: 160g)
- Average sleep: 7.5h
- Total km run: 6.2km
- Current streak: 21 days

Your personality:
- Direct and evidence-based. No fluff.
- Motivating but not toxic or over-enthusiastic.
- Suggest Nepali foods when relevant (dal bhat, momo, chiura, sel roti, gundruk, aloo tama).
- Respond in English unless the user writes in Nepali.
- Keep responses concise -- under 200 words unless the user asks for a detailed plan.

Hard constraints:
- Never recommend below 1,200 kcal/day.
- Never recommend more than 1kg/week weight loss.
- Always refer to a doctor for injuries or medical concerns.`;
}

async function callClaudeAPI(
  messages: { role: Role; content: string }[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return getPlaceholderResponse(messages[messages.length - 1]?.content ?? '');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   messages.map((m) => ({
          role:    m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Claude API error:', error);
      return getPlaceholderResponse(messages[messages.length - 1]?.content ?? '');
    }

    const data = await response.json();
    return data.content?.[0]?.text ?? 'Sorry, I could not generate a response. Try again.';
  } catch (err) {
    console.error('Claude fetch error:', err);
    return getPlaceholderResponse(messages[messages.length - 1]?.content ?? '');
  }
}

function getPlaceholderResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('week') || lower.includes('analyse')) {
    return `Here is your week breakdown:\n\nWorkouts: 4 of 5 planned. Good consistency. You missed one session -- make it up this weekend if you can.\n\nNutrition: Averaging 1,847 kcal against a 2,400 target. That 553 kcal gap will slow muscle gain significantly. Add a post-workout meal.\n\nSleep: 7.5h average. Solid. Aim for 8h on training nights.\n\nPriority this week: Hit 160g protein daily. Start with adding 2 boiled eggs to breakfast and extra dal at dinner. That alone adds 40-50g.`;
  }

  if (lower.includes('meal') || lower.includes('food') || lower.includes('eat')) {
    return `Nepal-adapted meal plan for muscle building at 2,400 kcal:\n\nBreakfast (620 kcal)\nDal bhat (1 plate) + 2 boiled eggs + milk tea\n\nPre-workout (200 kcal)\nChiura + banana\n\nLunch (680 kcal)\nChicken momo (10 pieces) + achar + tea\n\nPost-workout (300 kcal)\nWhey protein + banana\n\nDinner (600 kcal)\nDal bhat with extra dal + chicken curry + saag\n\nTotal: ~2,400 kcal · 165g protein · 280g carbs · 65g fat`;
  }

  if (lower.includes('plateau') || lower.includes('progress') || lower.includes('stuck')) {
    return `Three likely causes based on your data:\n\n1. Calorie deficit (most likely)\nYou are 553 kcal below target daily. You cannot build muscle in a sustained deficit. Increase your dal bhat portion and add a protein shake post-workout.\n\n2. Progressive overload stalling\nAre you adding weight or reps each week? If not, your body has adapted. Add 2.5kg to your main lifts next session.\n\n3. Sleep\nAt 7.5h you are close but not optimal. Muscle is built during sleep. Target 8-9h on training nights.\n\nFix the calories first -- that is your biggest lever.`;
  }

  if (lower.includes('workout') || lower.includes('train') || lower.includes('exercise')) {
    return `Today is Push day A based on your PPL program.\n\nMain lifts:\nBench press: 4 x 8 at 100kg (try +2.5kg today)\nIncline DB press: 3 x 10 at 30kg\nOverhead press: 3 x 8 at 52.5kg\n\nAccessory:\nLateral raise: 3 x 15 at 12kg\nTricep pushdown: 3 x 12 at 27.5kg\n\nYour HRV and sleep were good last night. Push the bench press weight today -- you are ready.`;
  }

  if (lower.includes('sleep')) {
    return `Your average is 7.5h which is good but not optimal for muscle building.\n\nTo improve:\n- Set a consistent bedtime -- same time every night, including weekends\n- Stop eating 2h before bed\n- Keep your room cool and dark\n- Avoid screens 30 min before sleep\n\nThe correlation is clear: your heaviest lifts happen after 8+ hours of sleep. Protecting your sleep is protecting your gains.`;
  }

  if (lower.includes('protein') || lower.includes('nepal')) {
    return `Best protein sources available in Nepal:\n\nAnimal sources:\nChicken (31g/100g) -- momos, curry, grilled\nBuff meat (26g/100g) -- widely available, affordable\nEggs (6g each) -- cheapest protein per rupee\nFish (20-25g/100g) -- rohu, catla from Terai\nMilk (3.4g/100ml) -- add to tea, oats\n\nPlant sources:\nDal/lentils (9g/100g cooked) -- eat more dal in dal bhat\nKwati (mixed beans, 8g/100g) -- traditional Nepali superfood\nSoybeans (36g/100g dry) -- underused in Nepal\n\nYou need 160g daily. Track it for one week and you will see exactly where you are falling short.`;
  }

  return `Based on your recent data -- 4 workouts, 1,847 avg calories, 7.5h sleep, and a 21-day streak -- you are doing well.\n\nYour biggest opportunity right now is nutrition. You are 48g of protein short daily on average. That gap is likely limiting your muscle building progress more than anything else.\n\nWhat specific aspect would you like to dig into?`;
}

export function AICoachScreen() {
  const [userContext, setUserContext] = useState<KaiContext | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [userCtx, setUserCtx] = useState({
    name:   'Athlete',
    goal:   'Build muscle',
    level:  'Intermediate',
    weight: '74kg',
  });
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadContext();
  }, []);
  
  async function loadContext() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const context = await exportService.getUserContext(user.id);
      setUserContext(context);
    } catch (err) {
      console.error('Could not load user context:', err);
    } finally {
      setContextLoading(false);
    }
  }

  useEffect(() => {
    loadUserAndGreet();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function loadUserAndGreet() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
  
    const context = await exportService.getUserContext(user.id);
    setUserContext(context);
  
    const greeting: Message = {
      id:      'greeting',
      role:    'assistant',
      content: `Namaste, ${context.profile.name}! I am Kai, your personal fitness coach.\n\nI have loaded your recent data:\n- Workouts this week: ${context.last7Days.workouts.length}\n- Avg calories: ${context.last7Days.avgCalories} kcal\n- Avg protein: ${context.last7Days.avgProtein}g\n- Avg sleep: ${context.last7Days.avgSleep}h\n- km run: ${context.last7Days.totalKmRun}km\n\nWhat would you like to work on?`,
      time:    formatTime(),
    };
  
    setMessages([greeting]);
    setContextLoading(false);
  }
  
  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
  
    setInput('');
  
    const userMsg: Message = {
      id:      `u-${Date.now()}`,
      role:    'user',
      content,
      time:    formatTime(),
    };
  
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
  
    try {
      const systemPrompt = userContext
        ? exportService.buildKaiPrompt(userContext)
        : buildSystemPrompt(userCtx);
  
      const apiMessages = updatedMessages.map((m) => ({
        role:    m.role,
        content: m.content,
      }));
  
      const responseText = await callClaudeAPI(apiMessages, systemPrompt);
  
      const assistantMsg: Message = {
        id:      `a-${Date.now()}`,
        role:    'assistant',
        content: responseText,
        time:    formatTime(),
      };
  
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Send message error:', err);
      const errorMsg: Message = {
        id:      `e-${Date.now()}`,
        role:    'assistant',
        content: 'Something went wrong. Please try again.',
        time:    formatTime(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    loadUserAndGreet();
  }

  const showQuickPrompts = messages.length <= 1;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.kaiAvatar}>
            <Ionicons name="sparkles" size={18} color={Colors.PURPLE} />
          </View>
          <View>
            <Text style={styles.kaiName}>Kai</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {loading ? 'Thinking...' : 'AI coach · Context loaded'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>Pro</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={clearChat}>
            <Ionicons name="refresh-outline" size={16} color={Colors.TEXT_TERTIARY} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Context strip */}
      <View style={styles.contextStrip}>
        <Ionicons name="checkmark-circle" size={12} color={Colors.TEAL} />
        <Text style={styles.contextText}>
          Kai has read your last 7 days of workouts, nutrition, and sleep
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.msgWrap,
              msg.role === 'user' && styles.msgWrapUser,
            ]}
          >
            {msg.role === 'assistant' && (
              <View style={styles.msgAvatar}>
                <Ionicons name="sparkles" size={11} color={Colors.PURPLE} />
              </View>
            )}

            <View style={[
              styles.bubble,
              msg.role === 'user'
                ? styles.bubbleUser
                : styles.bubbleAssistant,
            ]}>
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' && styles.bubbleTextUser,
              ]}>
                {msg.content}
              </Text>
              <Text style={[
                styles.bubbleTime,
                msg.role === 'user' && styles.bubbleTimeUser,
              ]}>
                {msg.time}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        {loading && (
          <View style={styles.msgWrap}>
            <View style={styles.msgAvatar}>
              <Ionicons name="sparkles" size={11} color={Colors.PURPLE} />
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { opacity: 1   }]} />
                <View style={[styles.typingDot, { opacity: 0.5 }]} />
                <View style={[styles.typingDot, { opacity: 0.2 }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick prompts -- only when chat is fresh */}
      {showQuickPrompts && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPromptsRow}
          style={styles.quickPromptsScroll}
        >
          {QUICK_PROMPTS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.quickPrompt}
              onPress={() => sendMessage(p.label)}
              activeOpacity={0.75}
            >
              <Ionicons name={p.icon} size={13} color={Colors.PURPLE} />
              <Text style={styles.quickPromptText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={styles.inputWrap}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Kai anything..."
            placeholderTextColor={Colors.TEXT_TERTIARY}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={(!input.trim() || loading) ? Colors.TEXT_TERTIARY : Colors.BG_BASE}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          Kai uses your fitness data to give personalised advice. Not medical advice.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.BG_BASE,
  },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.S5,
    paddingTop:        56,
    paddingBottom:     Spacing.S3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S3,
  },
  kaiAvatar: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: Colors.PURPLE + '18',
    borderWidth:     1.5,
    borderColor:     Colors.PURPLE + '35',
    alignItems:      'center',
    justifyContent:  'center',
  },
  kaiName: {
    fontSize:     16,
    fontWeight:   '600',
    color:        Colors.TEXT_PRIMARY,
    letterSpacing: -0.3,
    marginBottom:  2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  statusDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: Colors.TEAL,
  },
  statusText: {
    fontSize: 11,
    color:    Colors.TEXT_TERTIARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.S2,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.PURPLE + '15',
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.PURPLE + '30',
  },
  proBadgeText: {
    fontSize:   11,
    fontWeight: '600',
    color:      Colors.PURPLE,
  },
  headerBtn: {
    width:           36,
    height:          36,
    borderRadius:    10,
    backgroundColor: Colors.BG_SURFACE,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Context strip
  contextStrip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S2,
    backgroundColor:   Colors.TEAL + '08',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.TEAL + '20',
  },
  contextText: {
    fontSize:   11,
    color:      Colors.TEAL,
    fontWeight: '500',
  },

  // Messages
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S5,
    gap:               Spacing.S4,
  },
  msgWrap: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           Spacing.S2,
  },
  msgWrapUser: {
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: Colors.PURPLE + '15',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
    marginBottom:    2,
  },
  bubble: {
    maxWidth:     '80%',
    borderRadius: Radius.LG,
    padding:      Spacing.S3,
    gap:          6,
  },
  bubbleAssistant: {
    backgroundColor:    Colors.BG_SURFACE,
    borderWidth:        StyleSheet.hairlineWidth,
    borderColor:        Colors.BORDER,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor:     Colors.ACCENT_DIM,
    borderWidth:         StyleSheet.hairlineWidth,
    borderColor:         Colors.ACCENT + '25',
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize:   13,
    color:      Colors.TEXT_PRIMARY,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: Colors.TEXT_PRIMARY,
  },
  bubbleTime: {
    fontSize:  10,
    color:     Colors.TEXT_TERTIARY,
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: Colors.ACCENT + '70',
  },

  // Typing dots
  typingDots: {
    flexDirection: 'row',
    gap:           5,
    alignItems:    'center',
    paddingVertical: 4,
  },
  typingDot: {
    width:           7,
    height:          7,
    borderRadius:    3.5,
    backgroundColor: Colors.TEXT_TERTIARY,
  },

  // Quick prompts
  quickPromptsScroll: {
    flexGrow:   0,
    flexShrink: 0,
  },
  quickPromptsRow: {
    paddingHorizontal: Spacing.S5,
    paddingVertical:   Spacing.S3,
    gap:               8,
  },
  quickPrompt: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      Radius.FULL,
    backgroundColor:   Colors.BG_SURFACE,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.PURPLE + '35',
  },
  quickPromptText: {
    fontSize:   12,
    color:      Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },

  // Input
  inputWrap: {
    paddingHorizontal: Spacing.S5,
    paddingTop:        Spacing.S3,
    paddingBottom:     Spacing.S6,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    Colors.BORDER,
    gap:               Spacing.S2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           Spacing.S2,
  },
  input: {
    flex:              1,
    backgroundColor:   Colors.BG_SURFACE,
    borderRadius:      Radius.LG,
    paddingHorizontal: Spacing.S4,
    paddingVertical:   Spacing.S3,
    fontSize:          14,
    color:             Colors.TEXT_PRIMARY,
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       Colors.BORDER,
    maxHeight:         120,
    lineHeight:        20,
  },
  sendBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: Colors.ACCENT,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.BG_SURFACE_2,
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     Colors.BORDER,
  },
  disclaimer: {
    fontSize:   10,
    color:      Colors.TEXT_TERTIARY,
    textAlign:  'center',
    lineHeight: 15,
  },
});