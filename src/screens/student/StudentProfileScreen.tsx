import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { meApi } from "@/api/meApi";
import { getErrorMessage } from "@/api/http";
import { AppBadge } from "@/components/AppBadge";
import { AppButton } from "@/components/AppButton";
import { AppCard } from "@/components/AppCard";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { Screen } from "@/components/Screen";
import { StatusView } from "@/components/StatusView";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { formatDate, formatPaymentStatus } from "@/utils/format";

function getPaymentTone(status: string): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "partial":
      return "warning";
    case "late":
      return "danger";
    default:
      return "neutral";
  }
}

export function StudentProfileScreen() {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: meApi.getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: meApi.updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(["my-profile"], profile);
      if (typeof profile.current_class_id === "number") {
        setSelectedClassId(profile.current_class_id);
      }
    },
    onError: (error) => Alert.alert("Error", getErrorMessage(error)),
  });

  const profile = profileQuery.data;

  const handlePhotoSelection = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tus fotos para actualizar tu perfil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      updateProfileMutation.mutate({
        photoUri: result.assets[0].uri,
      });
    }
  };

  const handleClassUpdate = () => {
    if (selectedClassId === null) {
      Alert.alert("Selecciona una clase", "Elige una clase activa para guardarla como actual.");
      return;
    }

    updateProfileMutation.mutate({
      primaryClassId: selectedClassId,
    });
  };

  const requestSignOut = () => {
    setShowSignOutConfirm(true);
  };

  const cancelSignOut = () => {
    setShowSignOutConfirm(false);
  };

  const confirmSignOut = () => {
    setShowSignOutConfirm(false);
    void signOut();
  };

  if (profileQuery.isLoading) {
    return (
      <StatusView
        title="Cargando perfil"
        description="Estamos obteniendo tu información del dojo."
        loading
      />
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <Screen>
        <StatusView
          title="No pudimos cargar tu perfil"
          description={getErrorMessage(profileQuery.error)}
        />
        <AppButton label="Reintentar" onPress={() => profileQuery.refetch()} />
      </Screen>
    );
  }

  const currentClassId =
    selectedClassId ?? profile.current_class_id ?? profile.available_classes[0]?.id ?? null;
  const currentClass = profile.available_classes.find((item) => item.id === currentClassId) ?? null;

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl refreshing={profileQuery.isRefetching} onRefresh={profileQuery.refetch} />
      }
    >
      <View nativeID="screens-student-profile-top-actions" style={styles.topActions} testID="screens-student-profile-top-actions">
        <AppButton
          label="Cerrar sesión"
          nativeID="screens-student-profile-logout-button"
          onPress={requestSignOut}
          testID="screens-student-profile-logout-button"
          variant="secondary"
        />
      </View>

      <AppCard style={styles.profileHeader}>
        <View nativeID="screens-student-profile-header" style={styles.sectionMarker} testID="screens-student-profile-header">
        <Image
          source={{
            uri:
              profile.photo_url ??
              "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Brazilian%20jiu-jitsu%20student%20portrait%2C%20neutral%20background%2C%20clean%20uniform%2C%20professional%20mobile%20app%20avatar&image_size=square",
          }}
          style={styles.avatar}
        />
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{profile.full_name}</Text>
          <Text style={styles.meta}>Código: {profile.unique_code}</Text>
          <Text style={styles.meta}>Nacimiento: {formatDate(profile.birth_date)}</Text>
        </View>
        <View style={styles.badgesRow}>
          <AppBadge label={formatPaymentStatus(profile.payment_status)} tone={getPaymentTone(profile.payment_status)} />
          <AppBadge label={profile.status === "active" ? "Activo" : profile.status} tone="neutral" />
        </View>
        <AppButton
          label="Cambiar foto"
          nativeID="screens-student-profile-change-photo-button"
          loading={updateProfileMutation.isPending}
          onPress={handlePhotoSelection}
          testID="screens-student-profile-change-photo-button"
          variant="secondary"
        />
        </View>
      </AppCard>

      <AppCard>
        <View nativeID="screens-student-profile-summary-section" style={styles.sectionMarker} testID="screens-student-profile-summary-section">
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Correo</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Próximo pago</Text>
            <Text style={styles.infoValue}>{formatDate(profile.next_payment_date)}</Text>
          </View>
          <View style={styles.infoGroup}>
            <Text style={styles.infoLabel}>Clase actual</Text>
            <Text style={styles.infoValue}>{currentClass?.name ?? "Sin clase asignada"}</Text>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <View nativeID="screens-student-profile-current-class-section" style={styles.sectionMarker} testID="screens-student-profile-current-class-section">
          <Text style={styles.sectionTitle}>Clase actual</Text>
          {profile.available_classes.length > 0 ? (
            <>
              <Text style={styles.helperText}>
                Selecciona la clase que quieres marcar como principal en tu perfil.
              </Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={currentClassId}
                  onValueChange={(value) => setSelectedClassId(value as number)}
                >
                  {profile.available_classes.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.id} />
                  ))}
                </Picker>
              </View>
              {currentClass?.description ? (
                <Text style={styles.classDescription}>{currentClass.description}</Text>
              ) : null}
              <AppButton
                label="Guardar clase actual"
                nativeID="screens-student-profile-save-current-class-button"
                loading={updateProfileMutation.isPending}
                onPress={handleClassUpdate}
                testID="screens-student-profile-save-current-class-button"
              />
            </>
          ) : (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>Aún no hay clases disponibles</Text>
              <Text style={styles.emptyDescription}>
                Cuando el dojo publique clases activas para tu sucursal, podrás seleccionarlas aquí.
              </Text>
            </View>
          )}
        </View>
      </AppCard>
      <ConfirmActionModal
        confirmLabel="Si, cerrar sesión"
        idPrefix="screens-student-profile-signout-confirm"
        message="Se cerrará tu sesión actual y volverás a la pantalla de acceso."
        onCancel={cancelSignOut}
        onConfirm={confirmSignOut}
        title="Confirmar cierre de sesión"
        visible={showSignOutConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topActions: {
    alignItems: "flex-end",
  },
  sectionMarker: {
    gap: spacing.md,
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: colors.surfaceStrong,
    borderColor: "#2E241D",
    gap: spacing.md,
  },
  avatar: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    height: 112,
    width: 112,
  },
  profileCopy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  name: {
    color: colors.surface,
    fontFamily: typography.headingFamily,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  meta: {
    color: "#D1C2B5",
    fontFamily: typography.bodyFamily,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  infoGroup: {
    gap: 4,
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: typography.headingFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.text,
    fontFamily: typography.bodyFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  pickerWrapper: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  classDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  emptyBlock: {
    gap: spacing.xs,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: typography.headingFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontFamily: typography.bodyFamily,
    fontSize: 14,
    lineHeight: 20,
  },
});
