import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { meApi } from "@/api/meApi";
import { getErrorMessage } from "@/api/http";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { AppInput } from "@/components/AppInput";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing, typography } from "@/constants/theme";
import type { StudentStackParamList } from "@/navigation/types";

import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type FeedbackTone = "success" | "danger";

interface InlineFeedback {
  tone: FeedbackTone;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function SecuritySettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<InlineFeedback | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<InlineFeedback | null>(null);

  const changePasswordMutation = useMutation({
    mutationFn: meApi.changeMyPassword,
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPasswordFeedback({
        tone: "success",
        message: "Tu contraseña se actualizó correctamente.",
      });
    },
    onError: (error) => {
      setPasswordFeedback({
        tone: "danger",
        message: getErrorMessage(error),
      });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: meApi.changeMyEmail,
    onSuccess: () => {
      setNewEmail("");
      setEmailFeedback({
        tone: "success",
        message:
          "Se enviará un correo de confirmación a tu nuevo email para validar el cambio.",
      });
    },
    onError: (error) => {
      setEmailFeedback({
        tone: "danger",
        message: getErrorMessage(error),
      });
    },
  });

  const pendingPw = changePasswordMutation.isPending;
  const pendingEmail = changeEmailMutation.isPending;

  const pwLengthOk = newPw.length >= MIN_PASSWORD_LENGTH;
  const pwMatchOk = newPw.length > 0 && confirmPw === newPw;
  const canSubmitPassword =
    currentPw.length > 0 && pwLengthOk && pwMatchOk && !pendingPw;

  const emailValid = EMAIL_REGEX.test(newEmail.trim());
  const canSubmitEmail = emailValid && !pendingEmail;

  const handleSubmitPassword = () => {
    if (!canSubmitPassword) return;
    setPasswordFeedback(null);
    changePasswordMutation.mutate({
      current_password: currentPw,
      new_password: newPw,
      confirm_new_password: confirmPw,
    });
  };

  const handleSubmitEmail = () => {
    if (!canSubmitEmail) return;
    setEmailFeedback(null);
    changeEmailMutation.mutate({ new_email: newEmail.trim().toLowerCase() });
  };

  return (
    <Screen scrollable>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Feather color={colors.text} name="arrow-left" size={20} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Seguridad</Text>
            <Text style={styles.headerSub}>
              Actualiza tu contraseña y tu correo electrónico cuando lo necesites.
            </Text>
          </View>
        </View>

        <AppCard style={styles.sectionCard}>
          <View style={styles.sectionMarker}>
            <View style={styles.sectionIconWrap}>
              <Feather color={colors.primary} name="lock" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
              <Text style={styles.sectionSub}>
                Usa al menos {MIN_PASSWORD_LENGTH} caracteres. Te recomendamos combinar letras, números y símbolos.
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <AppInput
            label="Contraseña actual"
              nativeID="security-current-password"
              onChangeText={setCurrentPw}
              placeholder="Escribe tu contraseña actual"
              secureTextEntry
              testID="security-current-password"
              value={currentPw}
            />
            <AppInput
              label="Nueva contraseña"
              nativeID="security-new-password"
              onChangeText={(text) => {
                setNewPw(text);
                setPasswordFeedback(null);
              }}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              testID="security-new-password"
              value={newPw}
            />
            {newPw.length > 0 && !pwLengthOk ? (
              <Text style={[styles.hint, styles.hintDanger]}>
                La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.
              </Text>
            ) : null}
            <AppInput
              label="Confirmar nueva contraseña"
              nativeID="security-confirm-password"
              onChangeText={(text) => {
                setConfirmPw(text);
                setPasswordFeedback(null);
              }}
              placeholder="Repite la nueva contraseña"
              secureTextEntry
              testID="security-confirm-password"
              value={confirmPw}
            />
            {confirmPw.length > 0 && !pwMatchOk ? (
              <Text style={[styles.hint, styles.hintDanger]}>
                Las contraseñas no coinciden.
              </Text>
            ) : null}

            {passwordFeedback ? (
              <View
                style={[
                  styles.feedback,
                  passwordFeedback.tone === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackDanger,
                ]}
              >
                <Feather
                  color={passwordFeedback.tone === "success" ? colors.success : colors.danger}
                  name={passwordFeedback.tone === "success" ? "check-circle" : "alert-circle"}
                  size={16}
                />
                <Text
                  style={[
                    styles.feedbackText,
                  {
                    color:
                      passwordFeedback.tone === "success" ? colors.success : colors.danger,
                  },
                  ]}
                >
                  {passwordFeedback.message}
                </Text>
              </View>
            ) : null}

            <AppButton
              disabled={!canSubmitPassword}
              label="Cambiar contraseña"
              loading={pendingPw}
              nativeID="security-change-password-button"
              onPress={handleSubmitPassword}
              testID="security-change-password-button"
              variant="primary"
            />
          </View>
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <View style={styles.sectionMarker}>
            <View style={[styles.sectionIconWrap, { backgroundColor: `${colors.info}1F` }]}>
              <Feather color={colors.info} name="mail" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cambiar correo electrónico</Text>
              <Text style={styles.sectionSub}>
                Te enviaremos un link de confirmación al nuevo correo para validar que te pertenece.
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <AppInput
              autoCapitalize="none"
              keyboardType="email-address"
            label="Nuevo correo electrónico"
              nativeID="security-new-email"
              onChangeText={(text) => {
                setNewEmail(text);
                setEmailFeedback(null);
              }}
              placeholder="tu.nuevo@email.com"
              testID="security-new-email"
              value={newEmail}
            />
            {newEmail.length > 0 && !emailValid ? (
              <Text style={[styles.hint, styles.hintDanger]}>
                Ingresa un correo electrónico válido.
              </Text>
            ) : null}

            {emailFeedback ? (
              <View
                style={[
                  styles.feedback,
                  emailFeedback.tone === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackDanger,
                ]}
              >
                <Feather
                  color={emailFeedback.tone === "success" ? colors.success : colors.danger}
                  name={emailFeedback.tone === "success" ? "check-circle" : "alert-circle"}
                  size={16}
                />
                <Text
                  style={[
                    styles.feedbackText,
                    {
                      color:
                        emailFeedback.tone === "success" ? colors.success : colors.danger,
                    },
                  ]}
                >
                  {emailFeedback.message}
                </Text>
              </View>
            ) : null}

            <AppButton
              disabled={!canSubmitEmail}
              label="Cambiar correo"
              loading={pendingEmail}
              nativeID="security-change-email-button"
              onPress={handleSubmitEmail}
              testID="security-change-email-button"
              variant="primary"
            />
          </View>
        </AppCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  headerTitle: {
    color: colors.text,
    fontFamily: typography.displayFamily,
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  headerSub: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  sectionCard: {
    gap: spacing.md,
  },
  sectionMarker: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
  },
  sectionIconWrap: {
    alignItems: "center",
    backgroundColor: `${colors.primary}1F`,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionSub: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  formGroup: {
    gap: spacing.sm,
  },
  hint: {
    fontFamily: typography.bodyFamily,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  hintDanger: {
    color: colors.danger,
  },
  feedback: {
    alignItems: "center",
    borderRadius: radius.md,
    columnGap: spacing.sm,
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  feedbackSuccess: {
    backgroundColor: `${colors.success}14`,
  },
  feedbackDanger: {
    backgroundColor: `${colors.danger}14`,
  },
  feedbackText: {
    flex: 1,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
