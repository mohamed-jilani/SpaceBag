/**
 * services/permissions.ts — utilitaires de gestion des permissions
 *
 * Centralise les demandes de permissions pour :
 *   - Caméra (QR scan)
 *   - Galerie photos (upload de colis / KYC)
 *   - Localisation (suivi de colis)
 *
 * Chaque fonction renvoie un PermissionStatus :
 *   'granted' | 'denied' | 'undetermined'
 */

import { Platform, Linking, Alert } from 'react-native';
// Utiliser la classe Camera qui expose les méthodes statiques de permission
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface AllPermissions {
  camera: PermissionStatus;
  mediaLibrary: PermissionStatus;
  location: PermissionStatus;
}

// ─── Caméra ───────────────────────────────────────────────────────────────────

export async function getCameraStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await Camera.getCameraPermissionsAsync();
  return status as PermissionStatus;
}

export async function requestCameraPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status as PermissionStatus;
}

// ─── Galerie photos ───────────────────────────────────────────────────────────

export async function getMediaLibraryStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  return status as PermissionStatus;
}

export async function requestMediaLibraryPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status as PermissionStatus;
}

// ─── Localisation ─────────────────────────────────────────────────────────────

export async function getLocationStatus(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await Location.getForegroundPermissionsAsync();
  return status as PermissionStatus;
}

export async function requestLocationPermission(): Promise<PermissionStatus> {
  if (Platform.OS === 'web') return 'undetermined';
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status as PermissionStatus;
}

// ─── Toutes les permissions d'un coup ─────────────────────────────────────────

export async function getAllPermissionsStatus(): Promise<AllPermissions> {
  const [camera, mediaLibrary, location] = await Promise.all([
    getCameraStatus(),
    getMediaLibraryStatus(),
    getLocationStatus(),
  ]);
  return { camera, mediaLibrary, location };
}

/** Ouvre les paramètres système (si la permission est définitivement refusée) */
export function openAppSettings() {
  Linking.openSettings();
}

/**
 * Vérifie ou demande une permission, en ouvrant les paramètres si nécessaire.
 * Renvoie true si la permission est accordée.
 */
export async function ensurePermission(
  check: () => Promise<PermissionStatus>,
  request: () => Promise<PermissionStatus>,
  deniedMessage: string
): Promise<boolean> {
  let status = await check();
  if (status === 'granted') return true;
  if (status === 'undetermined') {
    status = await request();
    if (status === 'granted') return true;
  }
  Alert.alert(
    'Permission requise',
    `${deniedMessage}\n\nVoulez-vous ouvrir les paramètres ?`,
    [
      { text: 'Non', style: 'cancel' },
      { text: 'Ouvrir', onPress: openAppSettings },
    ]
  );
  return false;
}
