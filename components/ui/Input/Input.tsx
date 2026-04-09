/**
 * Input — champ texte avec label flottant, thème-aware
 *
 * v3 — Corrections :
 * - Utilise useTheme() pour les couleurs dynamiques (dark / light)
 * - Le fond, le texte, le label et la bordure s'adaptent au thème actif
 * - Les couleurs de l'animation (interpolateColor) utilisent les tokens du thème
 * - Compatible avec le fallback dark si ThemeProvider absent
 */

import React, { useState, useEffect } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing, typography, borderRadius, opacity, darkColors } from '@/constants/design';
import { animationDurations, animationEasing } from '@/constants/animations';
import type { InputProps } from './Input.types';

// Fallback sécurisé si useTheme n'est pas disponible
let useThemeSafe: () => { colors: typeof darkColors };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useTheme } = require('@/contexts/ThemeContext');
  useThemeSafe = useTheme;
} catch {
  useThemeSafe = () => ({ colors: darkColors });
}

// ─── Constantes de layout du label flottant ───────────────────────────────────
const CONTAINER_HEIGHT = 56;
const LABEL_TOP_RESTING = 16;
const LABEL_TOP_FLOATING = 6;
const LABEL_SCALE_RESTING = 1;
const LABEL_SCALE_FLOATING = 0.78;
const INPUT_PADDING_TOP_FLOATING = 22;

export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  error,
  disabled = false,
  leftIcon,
  rightIcon,
  clearable = false,
  multiline = false,
  numberOfLines = 4,
  accessibilityLabel,
  testID,
  ...textInputProps
}: InputProps) {
  const { colors } = useThemeSafe();
  const [isFocused, setIsFocused] = useState(false);

  const floatAnim = useSharedValue((value ?? '').length > 0 ? 1 : 0);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    const shouldFloat = (value ?? '').length > 0 || isFocused;
    floatAnim.value = withTiming(shouldFloat ? 1 : 0, {
      duration: animationDurations.fast,
      easing: animationEasing.easeOut,
    });
  }, [value, isFocused]);

  // ─── Styles animés ────────────────────────────────────────────────────────

  const labelAnimStyle = useAnimatedStyle(() => {
    const top =
      LABEL_TOP_RESTING + (LABEL_TOP_FLOATING - LABEL_TOP_RESTING) * floatAnim.value;
    const scale =
      LABEL_SCALE_RESTING + (LABEL_SCALE_FLOATING - LABEL_SCALE_RESTING) * floatAnim.value;
    return { top, transform: [{ scale }] };
  });

  // Bordure animée selon focus + erreur (couleurs du thème actif)
  const containerAnimStyle = useAnimatedStyle(() => {
    return {
      borderColor: error
        ? colors.error
        : interpolateColor(
            focusAnim.value,
            [0, 1],
            [colors.backgroundTertiary, colors.primary]
          ),
    };
  });

  // Couleur animée du label
  const labelColorStyle = useAnimatedStyle(() => {
    if (error) return { color: colors.error };
    return {
      color: interpolateColor(
        focusAnim.value,
        [0, 1],
        [colors.textTertiary, colors.primary]
      ),
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: animationDurations.fast });
    floatAnim.value = withTiming(1, {
      duration: animationDurations.fast,
      easing: animationEasing.easeOut,
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: animationDurations.fast });
    if (!(value ?? '').length) {
      floatAnim.value = withTiming(0, {
        duration: animationDurations.fast,
        easing: animationEasing.easeOut,
      });
    }
  };

  const handleClear = () => onChangeText('');
  const showClearButton = clearable && (value ?? '').length > 0 && !disabled;
  const isFloating = isFocused || (value ?? '').length > 0;

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          // Couleurs du thème injectées en inline (réactives aux changements)
          { backgroundColor: colors.backgroundSecondary },
          containerAnimStyle,
          multiline && styles.containerMultiline,
          disabled && styles.containerDisabled,
        ]}
      >
        {leftIcon && (
          <View style={styles.iconLeft}>{leftIcon}</View>
        )}

        <View style={[styles.field, leftIcon ? styles.fieldWithLeftIcon : undefined]}>
          {/* Label flottant (non-multiline) */}
          {label && !multiline && (
            <Animated.Text
              style={[styles.label, labelAnimStyle, labelColorStyle]}
              numberOfLines={1}
            >
              {label}
            </Animated.Text>
          )}

          {/* Label statique (multiline) */}
          {label && multiline && (
            <Text
              style={[
                styles.labelMultiline,
                { color: error ? colors.error : colors.textTertiary },
              ]}
            >
              {label}
            </Text>
          )}

          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={label ? (isFloating ? placeholder : undefined) : placeholder}
            placeholderTextColor={colors.textTertiary}
            editable={!disabled}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            textAlignVertical={multiline ? 'top' : 'center'}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityState={{ disabled }}
            testID={testID}
            style={[
              styles.input,
              // Couleur texte dynamique
              { color: colors.text },
              label && !multiline && styles.inputWithLabel,
              multiline && styles.inputMultiline,
              disabled && { color: colors.textDisabled },
            ]}
            {...textInputProps}
          />
        </View>

        {showClearButton && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.iconRight}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        {rightIcon && !showClearButton && (
          <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </Animated.View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

// ─── Styles statiques (pas de couleurs — gérées en inline/animated) ───────────

const styles = StyleSheet.create({
  wrapper: { width: '100%' },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: CONTAINER_HEIGHT,
    overflow: 'visible',
  },
  containerMultiline: {
    height: undefined,
    minHeight: 100,
    alignItems: 'flex-start',
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  containerDisabled: {
    opacity: opacity.disabled,
  },

  field: {
    flex: 1,
    position: 'relative',
    height: '100%',
    justifyContent: 'center',
  },
  fieldWithLeftIcon: {
    marginLeft: spacing.sm,
  },

  label: {
    position: 'absolute',
    left: 0,
    ...typography.body,
    transformOrigin: 'left center',
  },
  labelMultiline: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },

  input: {
    ...typography.body,
    padding: 0,
    margin: 0,
    minHeight: 24,
  },
  inputWithLabel: {
    paddingTop: INPUT_PADDING_TOP_FLOATING,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: spacing.xs,
  },

  iconLeft: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
