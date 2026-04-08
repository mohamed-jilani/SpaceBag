import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Container, Button, Card, Input, Avatar } from '@/components/ui';
import { colors, spacing, typography, borderRadius } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useRequests } from '@/hooks/useRequests';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/lib/cloudinary';
import { Trip } from '@/types';

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { profile, user } = useAuth();
  const { getTrip } = useTrips();
  const { createRequest } = useRequests();
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Request form state
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadTrip();
    }
  }, [id]);

  const loadTrip = async () => {
    try {
      const data = await getTrip(id as string);
      setTrip(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmitRequest = async () => {
    if (!weight || !dimensions || !description || !photoUri) {
      Alert.alert('Error', 'Please fill in all fields and provide a photo');
      return;
    }

    if (!trip || !user) return;

    try {
      setSubmitting(true);
      const photoUrl = await uploadImage(photoUri);
      
      await createRequest({
        tripId: trip.id,
        memberId: user.uid,
        carrierId: trip.carrierId,
        weight: parseFloat(weight),
        dimensions,
        description,
        photoUrl,
      });

      Alert.alert('Success', 'Delivery request sent!');
      setShowRequestForm(false);
      router.push('/(tabs)/requests');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Container>
    );
  }

  if (!trip) {
    return (
      <Container style={styles.centered}>
        <Text style={styles.errorText}>Trip not found</Text>
        <Button variant="primary" onPress={() => router.back()}>Go Back</Button>
      </Container>
    );
  }

  const isCarrier = trip.carrierId === user?.uid;

  return (
    <Container style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
        </View>

        <Card variant="elevated" style={styles.tripCard}>
          <View style={styles.routeContainer}>
            <View style={styles.cityBlock}>
              <Text style={styles.cityLabel}>From</Text>
              <Text style={styles.cityName}>{trip.departure}</Text>
            </View>
            <Ionicons name="airplane" size={24} color={colors.primary} style={styles.routeIcon} />
            <View style={styles.cityBlock}>
              <Text style={styles.cityLabel}>To</Text>
              <Text style={styles.cityName}>{trip.arrival}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{trip.date}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="wallet-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoValue}>€{trip.price} / kg</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="scale-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoValue}>{trip.maxWeight} kg max</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <View>
                <Text style={styles.infoLabel}>Items</Text>
                <Text style={styles.infoValue}>{trip.maxParcels} max</Text>
              </View>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{trip.description}</Text>
          </View>
        </Card>

        {profile?.role === 'member' && !isCarrier && (
          <View style={styles.actionSection}>
            {showRequestForm ? (
              <Card variant="outline" style={styles.formCard}>
                <Text style={styles.formTitle}>Request Delivery</Text>
                
                <Input
                  label="Parcel Weight (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 2.5"
                  keyboardType="numeric"
                />
                <Input
                  label="Dimensions (cm)"
                  value={dimensions}
                  onChangeText={setDimensions}
                  placeholder="e.g. 20x15x10"
                />
                <Input
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What are you sending?"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity 
                  style={styles.photoPicker} 
                  onPress={handlePickImage}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.textTertiary} />
                      <Text style={styles.photoText}>Add Parcel Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.formActions}>
                  <Button 
                    variant="ghost" 
                    onPress={() => setShowRequestForm(false)}
                    style={styles.flex1}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onPress={handleSubmitRequest}
                    loading={submitting}
                    style={styles.flex1}
                  >
                    Send Request
                  </Button>
                </View>
              </Card>
            ) : (
              <Button 
                variant="primary" 
                size="lg" 
                onPress={() => setShowRequestForm(true)}
              >
                Request Delivery
              </Button>
            )}
          </View>
        )}

        {isCarrier && (
          <View style={styles.actionSection}>
            <Button 
              variant="outline" 
              size="lg"
              onPress={() => router.push('/(tabs)/requests')}
            >
              Manage Requests
            </Button>
          </View>
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scroll: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    marginLeft: spacing.md,
  },
  tripCard: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
  },
  routeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  cityBlock: {
    flex: 1,
  },
  cityLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cityName: {
    ...typography.h3,
    color: colors.text,
  },
  routeIcon: {
    marginHorizontal: spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '45%',
  },
  infoLabel: {
    ...typography.tiny,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  descriptionSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  formCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.md,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  photoPicker: {
    height: 150,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
  },
});
