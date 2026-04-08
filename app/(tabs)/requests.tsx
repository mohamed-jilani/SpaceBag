import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Image, Alert, TextInput } from 'react-native';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useRequests } from '@/hooks/useRequests';
import { Ionicons } from '@expo/vector-icons';
import { Request, RequestStatus } from '@/types';
import { useRouter } from 'expo-router';
import { getOrCreateChat } from '@/hooks/useChat';

export default function RequestsScreen() {
  const { user, profile } = useAuth();
  const { requestsQuery, updateRequestStatus, generateCode } = useRequests();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [verifyCodeInput, setVerifyCodeInput] = useState<{ [key: string]: string }>({});
  const router = useRouter();

  const handleStatusUpdate = async (id: string, status: RequestStatus) => {
    try {
      setLoadingId(id);
      
      // If carrier marks as delivered, we generate the code but keep status as in_transit
      if (status === 'delivered' && profile?.role === 'carrier' && !verifyCodeInput[id]) {
        const code = generateCode();
        await updateRequestStatus({ id, status: 'in_transit', verificationCode: code });
        Alert.alert('Colis prêt !', `Le code de vérification est ${code}. Donnez-le au membre lors de la livraison.`);
        return;
      }

      await updateRequestStatus({ id, status });
      Alert.alert('Succès', `Statut mis à jour : ${status}`);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la mise à jour');
    } finally {
      setLoadingId(null);
    }
  };

  const handleChat = async (request: Request) => {
    try {
      setLoadingId(request.id);
      const chatId = await getOrCreateChat(request.id, request.memberId, request.carrierId);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la discussion');
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerifyCode = async (request: Request) => {
    const inputCode = verifyCodeInput[request.id];
    if (inputCode === request.verificationCode) {
      setLoadingId(request.id);
      try {
        await updateRequestStatus({ id: request.id, status: 'delivered' });
        Alert.alert('Livraison confirmée', 'Le colis a été livré avec succès.');
        setVerifyCodeInput(prev => ({ ...prev, [request.id]: '' }));
      } catch (error: any) {
        Alert.alert('Erreur', error.message || 'Échec de la confirmation');
      } finally {
        setLoadingId(null);
      }
    } else {
      Alert.alert('Erreur', 'Code de vérification incorrect');
    }
  };

  const renderRequest = ({ item }: { item: Request & { trip?: any } }) => (
    <Card variant="elevated" style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.tripInfo}>
          <Text style={styles.tripRoute}>
            {item.trip?.departure} <Ionicons name="arrow-forward" size={12} /> {item.trip?.arrival}
          </Text>
          <Text style={styles.requestDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.parcelInfo}>
        {item.photoUrl && (
          <Image source={{ uri: item.photoUrl }} style={styles.parcelPhoto} />
        )}
        <View style={styles.parcelDetails}>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.specRow}>
            <View style={styles.specItem}>
              <Ionicons name="scale-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.specText}>{item.weight} kg</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.specText}>{item.dimensions}</Text>
            </View>
          </View>
          {item.status === 'in_transit' && (
            <View style={styles.trackingInfo}>
              {profile?.role === 'member' ? (
                <View style={styles.codeBox}>
                  <Text style={styles.codeLabel}>Votre code de confirmation :</Text>
                  <Text style={styles.codeText}>{item.verificationCode}</Text>
                </View>
              ) : (
                <View style={styles.verifyBox}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="Entrez le code"
                    value={verifyCodeInput[item.id] || ''}
                    onChangeText={(text) => setVerifyCodeInput(prev => ({ ...prev, [item.id]: text }))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onPress={() => handleVerifyCode(item)}
                    loading={loadingId === item.id}
                  >
                    Valider
                  </Button>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        {/* Chat button for all active requests */}
        {item.status !== 'pending' && item.status !== 'refused' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onPress={() => handleChat(item)}
            style={styles.chatButton}
          >
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </Button>
        )}

        {profile?.role === 'carrier' && item.status === 'pending' && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              onPress={() => handleStatusUpdate(item.id, 'refused')}
              loading={loadingId === item.id}
              style={styles.flex1}
            >
              Refuser
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onPress={() => handleStatusUpdate(item.id, 'accepted')}
              loading={loadingId === item.id}
              style={styles.flex1}
            >
              Accepter
            </Button>
          </>
        )}

        {profile?.role === 'member' && item.status === 'accepted' && (
          <Button 
            variant="primary" 
            size="sm" 
            onPress={() => handleStatusUpdate(item.id, 'paid')}
            loading={loadingId === item.id}
            style={styles.flex1}
          >
            Payer (Simulation Stripe)
          </Button>
        )}

        {profile?.role === 'carrier' && item.status === 'paid' && (
          <Button 
            variant="primary" 
            size="sm" 
            onPress={() => handleStatusUpdate(item.id, 'in_transit')}
            loading={loadingId === item.id}
            style={styles.flex1}
          >
            Marquer comme récupéré
          </Button>
        )}

        {profile?.role === 'carrier' && item.status === 'in_transit' && !item.verificationCode && (
          <Button 
            variant="primary" 
            size="sm" 
            onPress={() => handleStatusUpdate(item.id, 'delivered')}
            loading={loadingId === item.id}
            style={styles.flex1}
          >
            Marquer comme livré
          </Button>
        )}
      </View>
    </Card>
  );

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
      </View>

      <FlatList
        data={requestsQuery.data}
        keyExtractor={item => item.id}
        renderItem={renderRequest}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={requestsQuery.isLoading && !!requestsQuery.data} 
            onRefresh={requestsQuery.refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="paper-plane-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>
              {profile?.role === 'carrier' 
                ? "No delivery requests for your trips yet" 
                : "You haven't made any delivery requests yet"}
            </Text>
            {profile?.role === 'member' && (
              <Button 
                variant="primary" 
                size="sm" 
                onPress={() => router.push('/(tabs)')}
                style={{ marginTop: spacing.md }}
              >
                Find a Trip
              </Button>
            )}
          </View>
        }
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  requestCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tripInfo: {
    gap: 2,
  },
  tripRoute: {
    ...typography.bodyBold,
    color: colors.text,
  },
  requestDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundDark,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusText: {
    ...typography.tinyBold,
    color: colors.primary,
  },
  parcelInfo: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  parcelPhoto: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundTertiary,
  },
  parcelDetails: {
    flex: 1,
    gap: 4,
  },
  description: {
    ...typography.body,
    color: colors.text,
  },
  specRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  flex1: {
    flex: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  chatButtonText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  trackingInfo: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeBox: {
    alignItems: 'center',
  },
  codeLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  codeText: {
    ...typography.h2,
    color: colors.primary,
    letterSpacing: 4,
  },
  verifyBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    ...typography.bodyBold,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
