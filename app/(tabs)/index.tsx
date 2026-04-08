import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Button, Card, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { profile, signOut } = useAuth();
  const carrierId = profile?.role === 'carrier' ? profile.uid : undefined;
  const { tripsQuery } = useTrips(carrierId);
  const router = useRouter();

  const renderTrip = ({ item }: { item: any }) => (
    <Card 
      variant="elevated" 
      style={styles.tripCard}
      onPress={() => router.push(`/trips/${item.id}`)}
    >
      <View style={styles.tripHeader}>
        <View style={styles.routeContainer}>
          <View style={styles.cityRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.cityName}>{item.departure}</Text>
          </View>
          <View style={styles.arrowRow}>
            <View style={styles.line} />
            <Ionicons name="airplane" size={16} color={colors.primary} />
            <View style={styles.line} />
          </View>
          <View style={styles.cityRow}>
            <Ionicons name="location-sharp" size={16} color={colors.primary} />
            <Text style={styles.cityName}>{item.arrival}</Text>
          </View>
        </View>
        <Text style={styles.price}>€{item.price}</Text>
      </View>

      <View style={styles.tripDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="scale-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.maxWeight} kg max</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="file-tray-full-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.maxParcels} items</Text>
        </View>
      </View>

      <Button 
        variant="outline" 
        size="sm" 
        style={styles.requestBtn}
        onPress={() => router.push(`/trips/${item.id}`)}
      >
        View Details
      </Button>
    </Card>
  );

  return (
    <Container style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Avatar 
            name={profile?.displayName || 'User'} 
            source={profile?.photoURL ? { uri: profile.photoURL } : undefined}
            size="md" 
          />
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{profile?.displayName || 'Welcome!'}</Text>
            <Text style={styles.userRole}>
              {profile?.role === 'carrier' ? 'Carrier' : 'Member'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {profile?.role === 'carrier' ? 'Your Active Trips' : 'Available Trips'}
          </Text>
          {profile?.role === 'carrier' ? (
            <Button 
              variant="primary" 
              size="sm" 
              onPress={() => router.push('/trips/new')}
            >
              Publish a Trip
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onPress={() => router.push('/(tabs)/requests')}
            >
              Find a Trip
            </Button>
          )}
        </View>

        <FlatList
          data={tripsQuery.data}
          keyExtractor={item => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={tripsQuery.isLoading && !!tripsQuery.data} 
              onRefresh={tripsQuery.refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="airplane-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>
                {profile?.role === 'carrier' 
                  ? "You haven't published any trips yet" 
                  : "No trips available at the moment"}
              </Text>
              {profile?.role === 'carrier' && (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onPress={() => router.push('/trips/new')}
                  style={{ marginTop: spacing.md }}
                >
                  Publish Your First Trip
                </Button>
              )}
            </View>
          }
        />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userMeta: {
    gap: 2,
  },
  userName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  userRole: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  tripCard: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 0.5,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary + '40',
  },
  price: {
    ...typography.h3,
    color: colors.primary,
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    backgroundColor: colors.backgroundTertiary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  requestBtn: {
    width: '100%',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
