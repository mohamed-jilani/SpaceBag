import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Container, Input, Button, Card } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/design';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';

export default function NewTripScreen() {
  const { profile } = useAuth();
  const { createTrip, isCreating } = useTrips();
  const router = useRouter();

  const [form, setForm] = useState({
    departure: '',
    arrival: '',
    date: '',
    price: '',
    maxWeight: '',
    maxParcels: '',
    description: '',
  });

  const handleCreate = async () => {
    if (!profile || profile.role !== 'carrier') {
      Alert.alert('Error', 'Only carriers can post trips');
      return;
    }

    if (!form.departure || !form.arrival || !form.date || !form.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await createTrip({
        departure: form.departure,
        arrival: form.arrival,
        date: form.date,
        price: parseFloat(form.price),
        maxWeight: parseFloat(form.maxWeight) || 0,
        maxParcels: parseInt(form.maxParcels) || 0,
        description: form.description,
        carrierId: profile.uid,
      });
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create trip');
    }
  };

  return (
    <Container style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Post a New Trip</Text>
          <Text style={styles.subtitle}>Enter your travel details to help others</Text>
        </View>

        <Card variant="elevated" style={styles.form}>
          <Input
            label="Departure City"
            placeholder="e.g. Paris"
            value={form.departure}
            onChangeText={(v) => setForm(f => ({ ...f, departure: v }))}
          />

          <Input
            label="Arrival City"
            placeholder="e.g. London"
            value={form.arrival}
            onChangeText={(v) => setForm(f => ({ ...f, arrival: v }))}
          />

          <Input
            label="Date of Trip"
            placeholder="YYYY-MM-DD"
            value={form.date}
            onChangeText={(v) => setForm(f => ({ ...f, date: v }))}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Price (EUR)"
                placeholder="15.00"
                value={form.price}
                onChangeText={(v) => setForm(f => ({ ...f, price: v }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Max Weight (kg)"
                placeholder="5"
                value={form.maxWeight}
                onChangeText={(v) => setForm(f => ({ ...f, maxWeight: v }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Input
            label="Max Parcels"
            placeholder="3"
            value={form.maxParcels}
            onChangeText={(v) => setForm(f => ({ ...f, maxParcels: v }))}
            keyboardType="numeric"
          />

          <Input
            label="Description (Optional)"
            placeholder="Extra details about your trip"
            value={form.description}
            onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
          />

          <Button 
            variant="primary" 
            onPress={handleCreate} 
            loading={isCreating}
            style={styles.submitBtn}
          >
            Post Trip
          </Button>
        </Card>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
