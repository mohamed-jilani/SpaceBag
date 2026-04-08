import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useMessages } from '@/hooks/useChat';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Bulle de message ────────────────────────────────────────────────────────

function MessageBubble({
  text,
  isMine,
  timestamp,
}: {
  text: string;
  isMine: boolean;
  timestamp: number;
}) {
  const formatTime = (ts: number) => {
    try {
      return format(ts, 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.bubbleWrapper, isMine ? styles.bubbleMineWrapper : styles.bubbleTheirsWrapper]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
          {text}
        </Text>
        <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs]}>
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
}

// ─── Séparateur de date ──────────────────────────────────────────────────────

function DateSeparator({ timestamp }: { timestamp: number }) {
  const label = isToday(timestamp)
    ? 'Aujourd\'hui'
    : isYesterday(timestamp)
    ? 'Hier'
    : format(timestamp, 'dd MMMM yyyy', { locale: fr });

  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

// ─── Écran de chat ────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(chatId);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !user || sending) return;

    setInputText('');
    setSending(true);
    try {
      await sendMessage(user.uid, text);
    } catch (error) {
      console.error('Erreur envoi message :', error);
      setInputText(text); // remettre le texte en cas d'erreur
    } finally {
      setSending(false);
    }
  }, [inputText, user, sending, sendMessage]);

  // ─── Rendu d'un item ─────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: (typeof messages)[0]; index: number }) => {
      const isMine = item.senderId === user?.uid;

      // Afficher le séparateur de date si c'est le premier message du jour
      const prev = messages[index - 1];
      const showDate =
        !prev ||
        new Date(item.createdAt).toDateString() !==
          new Date(prev.createdAt).toDateString();

      return (
        <>
          {showDate && <DateSeparator timestamp={item.createdAt} />}
          <MessageBubble
            text={item.text}
            isMine={isMine}
            timestamp={item.createdAt}
          />
        </>
      );
    },
    [messages, user?.uid]
  );

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ─── UI principale ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Conversation</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listEmpty,
        ]}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={56}
              color={colors.textTertiary}
            />
            <Text style={styles.emptyText}>Commencez la conversation !</Text>
            <Text style={styles.emptySubtext}>
              Envoyez votre premier message ci-dessous.
            </Text>
          </View>
        }
      />

      {/* Zone de saisie */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrivez un message…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            style={[
              styles.sendBtn,
              (!inputText.trim() || sending) && styles.sendBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
    backgroundColor: colors.backgroundSecondary,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  // Liste
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Séparateur de date
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.backgroundTertiary,
  },
  dateLabel: {
    ...typography.tiny,
    color: colors.textTertiary,
  },

  // Bulles
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  bubbleMineWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleTheirsWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.xs,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  bubbleTheirs: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
  },
  bubbleText: {
    ...typography.body,
    marginBottom: 2,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextTheirs: {
    color: colors.text,
  },
  bubbleTime: {
    ...typography.tiny,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.65)',
  },
  bubbleTimeTheirs: {
    color: colors.textTertiary,
  },

  // Barre de saisie
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 120,
    ...typography.body,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
});
